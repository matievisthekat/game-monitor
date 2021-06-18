FROM node:14
WORKDIR /usr/src/game-monitor

COPY package*.json ./

RUN npm install

COPY . .
EXPOSE 3000
CMD [ "node", "dist/index.js" ]