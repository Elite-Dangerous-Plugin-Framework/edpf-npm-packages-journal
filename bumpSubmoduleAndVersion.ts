#!/usr/bin/env bun

/**
 * This is expected to be called by CI in a periodic manner (e.g. every day).
 * It will try to bump the `./schema` submodule. If a change is found,
 * it will patch the `package.json` file's `version` in accordance to CalVer (0.YYYYMMDD.X)
 * and commit the change, tag the commit with the version, and then push both.
 *
 */

import { $ } from "bun";
import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { exit } from "node:process";

const todayTs = (() => {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
})();

console.log("Updating submodules…");
await $`git submodule update --remote`;
console.log("Updating submodules ✅");

console.log("Checking for changes…");
const status = await $`git status --porcelain`.text();

if (!status.includes("schema")) {
  console.log("Checking for changes… No changes in schema. Aborting now…");
  exit(0);
}

// if here: we need to regenerate the typings
await $`bun run generate.ts`;

const packageJson = JSON.parse(await readFile("package.json", "utf-8"));
const oldVersion = packageJson.version as string;
const newVersion = (() => {
  // Expected format: 0.YYYYMMDD.X
  const match = /^0\.(\d{8})\.(\d+)$/.exec(oldVersion);
  if (!match || match[1] !== todayTs) {
    return `0.${todayTs}.0`;
  }
  return `0.${todayTs}.${Number(match[2]) + 1}`;
})();
packageJson.version = newVersion;
await writeFile("package.json", JSON.stringify(packageJson, undefined, 2));

console.log(`bumped version from v${oldVersion} to v${newVersion}`);

await $`git add schema package.json`;
await $`git commit -m ${`chore: bump schema to ${newVersion}`}`;
await $`git tag ${newVersion}`;
//await $`git push`;
//await $`git push --tags`;

console.log("commited, pushed, and tagged for version v" + newVersion);

export {};
