FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

# Copiar solo los archivos que realmente existen
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
