mkdir -p public/vlatest
rm -rf public/vlatest/*
cp -R public/v$1/* public/vlatest

docker build . -t pwm-downloader
docker tag pwm-downloader dr.trentinosviluppo.it/pwm-downloader
docker push dr.trentinosviluppo.it/pwm-downloader