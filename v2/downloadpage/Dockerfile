FROM httpd:2.4

RUN mkdir -p /usr/local/apache2/htdocs/releases/

COPY ./downloadpage/index.html /usr/local/apache2/htdocs/
COPY ./downloadpage/dora.sh /usr/local/apache2/htdocs/
COPY ./build/builds/ /usr/local/apache2/htdocs/releases/