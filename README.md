<div align="center">
  
  # Game Monitor

  This project monitors game availability on Xbox and Nintendo sites (United States, Europe, Japan)
  
</div>

---

## Setup Instructions

- *Note: you will need ~4GB of RAM and ~4 CPU cores to run this program efficiently*
- *Tip: any time you get a 'permission denied' error when running a command, try running the command again with `sudo` in front of it*

Login to your server. You will have a username (it should be "root"), a password, and the server's ip address.
If you are on windows you will need to install [PuTTY](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html). If you are on linux or mac just run `ssh <username>@<ip>`

Enter the password when prompted.

Run `adduser <username>` Replace `<username>` with a username of your choice

Run `usermod -aG sudo <username>`

Run `su - <username>`

Run `sudo apt update -y && sudo apt upgrade -y` and allow it to update

Run `sudo apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils docker.io build-essential`

Run `curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -`

Run `sudo apt install nodejs`

Run `npm i -g yarn`

Run `npm i -g pm2`

Run `git clone https://github.com/matievisthekat/game-monitor` and login when prompted

Run `cd game-monitor`

Run `yarn install`

The project is now ready to run.
- If you want to make sure it works:
  - Run `yarn start`
  - The output should end with `[api] Listening on port 3000`
- If you want to run it in the background: (recommended)
  - Run `pm2 start`
  - Run `pm2 logs 0`
  - The output should end with `[api] Listening on port 3000`
  - You can now exit  and the program will continue to run. It will update every Sunday
