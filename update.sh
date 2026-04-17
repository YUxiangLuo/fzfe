echo "===========FRONTEND GIT PULL==========="
git pull
sleep 2

echo "===========run actions================"
./actions.sh
sleep 2

echo "=============VITE BUILD============"
bunx vite build
sleep 2

echo "=============RSYNC DIST============="
rsync --progress --delete -r ./dist/* /var/www/fangzhen/
sleep 2

echo "=============RSYNC NGINX CONFIG==========="
sudo rsync --progress ./nginx-fangzhen /etc/nginx/sites-available/fangzhen
sleep 2

echo "=============RESTART NGINX=========="
sudo systemctl restart nginx
