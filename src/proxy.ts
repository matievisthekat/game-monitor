import Proxy from "proxy-chain";

const proxies = [
  "69.167.174.17:80",
  "187.49.190.33:999",
  "149.28.207.8:3128",
  "140.227.62.35:58888",
  "77.72.3.163:80",
];

const server = new Proxy.Server({
  port: 3001,
  prepareRequestFunction: () => {
    return { upstreamProxyUrl: `http://${proxies[Math.floor(Math.random() * proxies.length)]}` };
  },
});

server.listen(() => console.log("[proxy] Listening on port 3001"));
