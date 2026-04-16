echo "===========FRONTEND GIT PULL==========="
git pull

echo "=============VITE BUILD============"
bunx vite build

echo "=============RSYNC DIST============="
rsync --progress --delete -r ./dist/* /var/www/fangzhen/

echo "=============RESTART NGINX=========="
sudo systemctl restart nginx
