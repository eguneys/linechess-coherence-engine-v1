## Service File Folder
/etc/systemd/system/linechess.service

## First-Time Server Setup (Once)
sudo useradd -r -s /bin/false linechess
sudo mkdir -p /var/www/linechess-api/data
sudo chown -R linechess:linechess /var/www/linechess-api

## Enable It
sudo systemctl daemon-reload
sudo systemctl enable morchess
sudo systemctl start morchess

## Check logs:
journalctl -u linechess -f


## Restart
sudo systemctl restart linechess


## Deploy Folder Ownerships
sudo mkdir -p /var/www/linechess-api
sudo chown -R deploy:deploy /var/www/linechess-api