echo "===========FRONTEND GIT PULL==========="
git pull

echo "===========run actions================"
./actions.sh

echo "=============VITE BUILD============"
bunx vite build

echo "=============RSYNC DIST============="
rsync --progress --delete -r ./dist/* /var/www/fangzhen/

echo "=============RSYNC NGINX CONFIG==========="
sudo rsync --progress ./nginx-fangzhen /etc/nginx/sites-available/fangzhen

echo "=============RESTART NGINX=========="
sudo systemctl restart nginx
