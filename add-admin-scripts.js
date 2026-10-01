const fs = require("fs");
const path = require("path");

const f = path.join(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(f, "utf8"));

pkg.scripts["dev:admin"] = "npm --workspace admin-web run dev";
pkg.scripts["build:admin"] = "npm --workspace admin-web run build";
pkg.scripts["typecheck"] = "npm --workspace shared run typecheck && npm --workspace server run typecheck && npm --workspace admin-web run typecheck";

fs.writeFileSync(f, JSON.stringify(pkg, null, 2) + "\n", { encoding: "utf8" });
console.log("OK: package.json updated (dev:admin, build:admin)");