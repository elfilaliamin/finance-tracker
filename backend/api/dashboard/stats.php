<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$svc = new CurrencyService($pdo);
$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
$displayCurrency = clean_str($_GET['display_currency'] ?? null) ?? $settings['display_currency'];

$toDisplay = fn(float $madAmount) => $svc->convertFromBase($madAmount, $displayCurrency);

$today = new DateTime();
$curYear = (int)$today->format('Y');
$curMonth = (int)$today->format('n');
$prevMonthDate = (clone $today)->modify('first day of last month');
$prevYear = (int)$prevMonthDate->format('Y');
$prevMonth = (int)$prevMonthDate->format('n');

function scalar($pdo, string $sql, array $params = []) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $v = $stmt->fetchColumn();
    return $v === false ? 0 : (float)$v;
}

// --- Income cards ---
$currentMonthIncome = scalar($pdo, 'SELECT COALESCE(SUM(base_amount),0) FROM income WHERE year=:y AND month=:m', ['y' => $curYear, 'm' => $curMonth]);
$previousMonthIncome = scalar($pdo, 'SELECT COALESCE(SUM(base_amount),0) FROM income WHERE year=:y AND month=:m', ['y' => $prevYear, 'm' => $prevMonth]);
$yearIncome = scalar($pdo, 'SELECT COALESCE(SUM(base_amount),0) FROM income WHERE year=:y', ['y' => $curYear]);
$lifetimeIncome = scalar($pdo, 'SELECT COALESCE(SUM(base_amount),0) FROM income');

// PostgreSQL: COUNT(DISTINCT ...) with concatenation uses ||
$monthCountStmt = $pdo->query("SELECT COUNT(DISTINCT (year::text || '-' || month::text)) AS c FROM income");
$monthCount = max(1, (int)$monthCountStmt->fetch()['c']);
$avgMonthlyIncome = $lifetimeIncome / $monthCount;

$highestMonth = $pdo->query(
    'SELECT year, month, SUM(base_amount) AS total FROM income GROUP BY year, month ORDER BY total DESC LIMIT 1'
)->fetch();
$lowestMonth = $pdo->query(
    'SELECT year, month, SUM(base_amount) AS total FROM income GROUP BY year, month ORDER BY total ASC LIMIT 1'
)->fetch();

$largestSource = $pdo->query(
    'SELECT s.name, SUM(i.base_amount) AS total FROM income i JOIN income_sources s ON s.id=i.income_source_id
     GROUP BY s.id, s.name ORDER BY total DESC LIMIT 1'
)->fetch();

$sourceCount = (int)scalar($pdo, "SELECT COUNT(*) FROM income_sources WHERE status='active'");

$latestIncome = $pdo->query('SELECT i.*, s.name AS source_name FROM income i JOIN income_sources s ON s.id=i.income_source_id ORDER BY entry_date DESC, i.id DESC LIMIT 1')->fetch();
$latestNetWorth = $pdo->query('SELECT * FROM networth ORDER BY entry_date DESC LIMIT 1')->fetch();
$prevNetWorthRow = null;
if ($latestNetWorth) {
    $stmt = $pdo->prepare('SELECT * FROM networth WHERE entry_date < :d ORDER BY entry_date DESC LIMIT 1');
    $stmt->execute(['d' => $latestNetWorth['entry_date']]);
    $prevNetWorthRow = $stmt->fetch();
}

$monthlyGrowthPct = $previousMonthIncome > 0 ? round((($currentMonthIncome - $previousMonthIncome) / $previousMonthIncome) * 100, 2) : null;
$netWorthGrowthPct = ($prevNetWorthRow && (float)$prevNetWorthRow['base_amount'] != 0)
    ? round((((float)$latestNetWorth['base_amount'] - (float)$prevNetWorthRow['base_amount']) / abs((float)$prevNetWorthRow['base_amount'])) * 100, 2)
    : null;

// --- Period-based trend + growth chart (buttons: week / month / year) ---
$period = in_array($_GET['period'] ?? '', ['week', 'month', 'year']) ? $_GET['period'] : 'year';

// Year selector: which calendar year the charts are scoped to / anchored on.
// PostgreSQL: EXTRACT(YEAR FROM entry_date)
$availableYearsRaw = array_unique(array_merge(
    $pdo->query('SELECT DISTINCT year FROM income')->fetchAll(PDO::FETCH_COLUMN),
    $pdo->query('SELECT DISTINCT EXTRACT(YEAR FROM entry_date)::int FROM networth')->fetchAll(PDO::FETCH_COLUMN)
));
$availableYearsRaw[] = $curYear;
$availableYears = array_values(array_unique(array_map('intval', $availableYearsRaw)));
rsort($availableYears);

$selectedYear = (int)($_GET['year'] ?? $curYear);
if (!in_array($selectedYear, $availableYears, true)) $selectedYear = $curYear;

// When browsing a past year, anchor "today" to Dec 31 of that year so
// week/month windows fall inside the year being reviewed.
$referenceDate = ($selectedYear === $curYear) ? new DateTime('today') : new DateTime("$selectedYear-12-31");

function build_period_points(string $period, DateTime $referenceDate): array {
    $points = [];
    $today = $referenceDate;
    if ($period === 'week') {
        for ($i = 6; $i >= 0; $i--) {
            $d = (clone $today)->modify("-$i days");
            $points[] = ['label' => $d->format('D d/m'), 'start' => $d->format('Y-m-d'), 'end' => $d->format('Y-m-d')];
        }
    } elseif ($period === 'month') {
        for ($i = 29; $i >= 0; $i--) {
            $d = (clone $today)->modify("-$i days");
            $points[] = ['label' => $d->format('d/m'), 'start' => $d->format('Y-m-d'), 'end' => $d->format('Y-m-d')];
        }
    } else {
        for ($i = 11; $i >= 0; $i--) {
            $d = (clone $today)->modify("first day of this month")->modify("-$i months");
            $start = $d->format('Y-m-01');
            $end = $d->format('Y-m-t');
            $points[] = ['label' => $d->format('M Y'), 'start' => $start, 'end' => $end];
        }
    }
    return $points;
}

$periodPoints = build_period_points($period, $referenceDate);

$incomeByRangeStmt = $pdo->prepare('SELECT COALESCE(SUM(base_amount),0) AS t FROM income WHERE entry_date BETWEEN :s AND :e');
$trend = [];
foreach ($periodPoints as $p) {
    $incomeByRangeStmt->execute(['s' => $p['start'], 'e' => $p['end']]);
    $trend[] = ['label' => $p['label'], 'value' => $toDisplay((float)$incomeByRangeStmt->fetchColumn())];
}

// Income growth: straightforward point-over-point % change.
$incomeGrowth = [];
for ($i = 0; $i < count($trend); $i++) {
    if ($i === 0) { $incomeGrowth[] = ['label' => $trend[$i]['label'], 'value' => null]; continue; }
    $prev = $trend[$i - 1]['value'];
    $cur = $trend[$i]['value'];
    $incomeGrowth[] = ['label' => $trend[$i]['label'], 'value' => $prev > 0 ? round((($cur - $prev) / $prev) * 100, 2) : null];
}

// Net worth growth: only report a value on periods where a NEW snapshot was
// actually recorded (comparing it against the last known prior snapshot).
$firstStart = $periodPoints[0]['start'];
$baselineStmt = $pdo->prepare('SELECT base_amount FROM networth WHERE entry_date < :d ORDER BY entry_date DESC LIMIT 1');
$baselineStmt->execute(['d' => $firstStart]);
$lastKnown = $baselineStmt->fetchColumn();
$lastKnown = $lastKnown !== false ? (float)$lastKnown : null;

$snapshotInRangeStmt = $pdo->prepare('SELECT base_amount FROM networth WHERE entry_date BETWEEN :s AND :e ORDER BY entry_date DESC LIMIT 1');
$netWorthGrowth = [];
foreach ($periodPoints as $p) {
    $snapshotInRangeStmt->execute(['s' => $p['start'], 'e' => $p['end']]);
    $snap = $snapshotInRangeStmt->fetchColumn();
    if ($snap === false) {
        $netWorthGrowth[] = ['label' => $p['label'], 'value' => null];
        continue;
    }
    $newVal = (float)$snap;
    $growth = ($lastKnown !== null && $lastKnown != 0) ? round((($newVal - $lastKnown) / abs($lastKnown)) * 100, 2) : null;
    $netWorthGrowth[] = ['label' => $p['label'], 'value' => $growth];
    $lastKnown = $newVal;
}

// Income by source / net worth history scoped to the selected year.
$bySourceRows = $pdo->prepare(
    'SELECT s.name, s.color, SUM(i.base_amount) AS total FROM income i
     JOIN income_sources s ON s.id = i.income_source_id WHERE i.year = :year GROUP BY s.id, s.name, s.color ORDER BY total DESC'
);
$bySourceRows->execute(['year' => $selectedYear]);
$bySourceRows = $bySourceRows->fetchAll();

// PostgreSQL: EXTRACT(YEAR FROM entry_date)
$netWorthHistoryStmt = $pdo->prepare(
    "SELECT entry_date, base_amount FROM networth WHERE EXTRACT(YEAR FROM entry_date) = :year ORDER BY entry_date ASC"
);
$netWorthHistoryStmt->execute(['year' => $selectedYear]);
$netWorthHistory = $netWorthHistoryStmt->fetchAll();

// Year comparison intentionally stays cross-year (that's its whole purpose) —
// the selected year is returned separately so the frontend can highlight it.
$yearComparison = $pdo->query('SELECT year, SUM(base_amount) AS total FROM income GROUP BY year ORDER BY year')->fetchAll();

json_ok([
    'display_currency' => $displayCurrency,
    'period' => $period,
    'year' => $selectedYear,
    'available_years' => $availableYears,
    'cards' => [
        'today_net_worth' => $latestNetWorth ? $toDisplay((float)$latestNetWorth['base_amount']) : null,
        'current_month_income' => $toDisplay($currentMonthIncome),
        'previous_month_income' => $toDisplay($previousMonthIncome),
        'year_income' => $toDisplay($yearIncome),
        'lifetime_income' => $toDisplay($lifetimeIncome),
        'average_monthly_income' => $toDisplay($avgMonthlyIncome),
        'highest_income_month' => $highestMonth ? ['year' => $highestMonth['year'], 'month' => $highestMonth['month'], 'amount' => $toDisplay((float)$highestMonth['total'])] : null,
        'lowest_income_month' => $lowestMonth ? ['year' => $lowestMonth['year'], 'month' => $lowestMonth['month'], 'amount' => $toDisplay((float)$lowestMonth['total'])] : null,
        'largest_income_source' => $largestSource ? ['name' => $largestSource['name'], 'amount' => $toDisplay((float)$largestSource['total'])] : null,
        'number_of_income_sources' => $sourceCount,
        'monthly_growth_pct' => $monthlyGrowthPct,
        'net_worth_growth_pct' => $netWorthGrowthPct,
        'latest_income' => $latestIncome ? [
            'source' => $latestIncome['source_name'], 'date' => $latestIncome['entry_date'],
            'amount' => $toDisplay((float)$latestIncome['base_amount']),
        ] : null,
        'latest_net_worth' => $latestNetWorth ? ['date' => $latestNetWorth['entry_date'], 'amount' => $toDisplay((float)$latestNetWorth['base_amount'])] : null,
    ],
    'charts' => [
        'income_by_source' => array_map(fn($r) => ['name' => $r['name'], 'color' => $r['color'], 'value' => $toDisplay((float)$r['total'])], $bySourceRows),
        'net_worth_history' => array_map(fn($r) => ['date' => $r['entry_date'], 'value' => $toDisplay((float)$r['base_amount'])], $netWorthHistory),
        'year_comparison' => array_map(fn($r) => ['year' => $r['year'], 'value' => $toDisplay((float)$r['total'])], $yearComparison),
        'income_trend' => $trend,
        'income_growth' => $incomeGrowth,
        'net_worth_growth' => $netWorthGrowth,
    ],
]);
