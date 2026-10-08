<?php
/**
 * CurrencyService
 * Single place responsible for: fetching live rates (with API fallback chain),
 * caching them in `exchange_rates`, converting amounts historical-vs-live,
 * and formatting for display. Every endpoint should use this — no
 * duplicated conversion math elsewhere.
 *
 * Base currency is always MAD. rate_to_base means: 1 unit of `currency` = rate_to_base MAD.
 */
class CurrencyService
{
    const BASE = 'MAD';
    const SUPPORTED = ['MAD', 'USD', 'EUR'];

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /** Get the freshest cached rate for a currency (rate_to_base, in MAD). */
    public function getCachedRate(string $currency): ?array
    {
        if ($currency === self::BASE) {
            return ['currency' => 'MAD', 'rate_to_base' => 1.0, 'source_api' => 'identity', 'fetched_at' => date('Y-m-d H:i:s')];
        }
        $stmt = $this->pdo->prepare(
            'SELECT currency, rate_to_base, source_api, fetched_at FROM exchange_rates
             WHERE currency = :c ORDER BY fetched_at DESC LIMIT 1'
        );
        $stmt->execute(['c' => $currency]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Fetch fresh rates from the API fallback chain and store them.
     * Returns ['USD' => rate, 'EUR' => rate] to MAD, plus which API answered.
     */
    public function refreshRates(): array
    {
        $rates = null;
        $sourceUsed = null;

        // 1. frankfurter.app  (base=USD, then convert manually to MAD-relative)
        $rates = $this->tryFrankfurter();
        if ($rates) $sourceUsed = 'frankfurter';

        // 2. open.er-api.com
        if (!$rates) {
            $rates = $this->tryOpenErApi();
            if ($rates) $sourceUsed = 'open.er-api';
        }

        // 3. exchangerate.host
        if (!$rates) {
            $rates = $this->tryExchangerateHost();
            if ($rates) $sourceUsed = 'exchangerate.host';
        }

        if (!$rates) {
            // 4. fall back to whatever is cached
            $cached = [];
            foreach (['USD', 'EUR'] as $cur) {
                $r = $this->getCachedRate($cur);
                if ($r) $cached[$cur] = (float)$r['rate_to_base'];
            }
            return ['rates' => $cached, 'source' => 'cached', 'success' => count($cached) > 0];
        }

        // Persist
        foreach ($rates as $cur => $rateToMad) {
            $stmt = $this->pdo->prepare(
                'INSERT INTO exchange_rates (base_currency, currency, rate_to_base, source_api)
                 VALUES (:base, :cur, :rate, :src)'
            );
            $stmt->execute(['base' => self::BASE, 'cur' => $cur, 'rate' => $rateToMad, 'src' => $sourceUsed]);
        }

        return ['rates' => $rates, 'source' => $sourceUsed, 'success' => true];
    }

    private function httpGetJson(string $url, int $timeout = 6): ?array
    {
        $ctx = stream_context_create(['http' => ['timeout' => $timeout], 'https' => ['timeout' => $timeout]]);
        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false) return null;
        $json = json_decode($raw, true);
        return is_array($json) ? $json : null;
    }

    private function tryFrankfurter(): ?array
    {
        // https://api.frankfurter.app/latest?from=MAD&to=USD,EUR
        $json = $this->httpGetJson('https://api.frankfurter.app/latest?from=MAD&to=USD,EUR');
        if (!$json || empty($json['rates'])) return null;
        // json.rates gives: 1 MAD = X USD. We need 1 USD = ? MAD => invert.
        $out = [];
        foreach (['USD', 'EUR'] as $cur) {
            if (isset($json['rates'][$cur]) && $json['rates'][$cur] > 0) {
                $out[$cur] = round(1 / $json['rates'][$cur], 6);
            }
        }
        return count($out) === 2 ? $out : null;
    }

    private function tryOpenErApi(): ?array
    {
        // https://open.er-api.com/v6/latest/MAD  -> rates.USD = 1 MAD in USD (need inverse)
        $json = $this->httpGetJson('https://open.er-api.com/v6/latest/MAD');
        if (!$json || ($json['result'] ?? '') !== 'success' || empty($json['rates'])) return null;
        $out = [];
        foreach (['USD', 'EUR'] as $cur) {
            if (isset($json['rates'][$cur]) && $json['rates'][$cur] > 0) {
                $out[$cur] = round(1 / $json['rates'][$cur], 6);
            }
        }
        return count($out) === 2 ? $out : null;
    }

    private function tryExchangerateHost(): ?array
    {
        // https://api.exchangerate.host/latest?base=MAD&symbols=USD,EUR
        $json = $this->httpGetJson('https://api.exchangerate.host/latest?base=MAD&symbols=USD,EUR');
        if (!$json || empty($json['rates'])) return null;
        $out = [];
        foreach (['USD', 'EUR'] as $cur) {
            if (isset($json['rates'][$cur]) && $json['rates'][$cur] > 0) {
                $out[$cur] = round(1 / $json['rates'][$cur], 6);
            }
        }
        return count($out) === 2 ? $out : null;
    }

    /** Convert a base-currency (MAD) amount into $target using cached (live) rate. */
    public function convertFromBase(float $madAmount, string $target): float
    {
        if ($target === self::BASE) return $madAmount;
        $rate = $this->getCachedRate($target);
        $r = $rate ? (float)$rate['rate_to_base'] : 1.0;
        return $r > 0 ? round($madAmount / $r, 2) : $madAmount;
    }

    /** Convert an original amount+currency into MAD (base) using rate at entry time. */
    public function toBaseAtRate(float $amount, float $rateToBase): float
    {
        return round($amount * $rateToBase, 2);
    }

    /** Get "current" rate to use when entering a NEW record (for exchange_rate_used). */
    public function currentRateFor(string $currency): float
    {
        if ($currency === self::BASE) return 1.0;
        $cached = $this->getCachedRate($currency);
        return $cached ? (float)$cached['rate_to_base'] : 1.0;
    }

    public function format(float $amount, string $currency): string
    {
        $symbols = ['MAD' => 'MAD', 'USD' => '$', 'EUR' => '€'];
        $sym = $symbols[$currency] ?? $currency;
        $formatted = number_format($amount, 2);
        return $currency === 'MAD' ? "$formatted MAD" : "$sym$formatted";
    }
}
