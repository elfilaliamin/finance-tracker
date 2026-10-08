FROM nginx:alpine

# Remove the default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the frontend static files
COPY public/ /usr/share/nginx/html/

EXPOSE 80
