FROM php:8.2-apache

# Install PostgreSQL PDO driver
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite and AllowOverride for .htaccess security
RUN a2enmod rewrite \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Set the document root to /var/www/html
# Apache's default config already serves from /var/www/html

# Copy all backend PHP code
COPY api/ /var/www/html/api/

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html

# Configure PHP for sessions
RUN mkdir -p /var/lib/php/sessions && chown www-data:www-data /var/lib/php/sessions

EXPOSE 80
