import { exec } from "child_process";
import * as fs from "fs";
import * as npa from "npm-package-arg";
import { join } from "path";

export default function installDependencies(
  dependency: { name: string; version: string, nodePath: string },
  packagePath: string,
) {
  return new Promise((resolve, reject) => {
    const depString = `${dependency.name}@${dependency.version}`;

    const spec = npa(depString);

    exec(
      `mkdir -p ${packagePath} && cd ${packagePath} && HOME=/tmp node ${join(
        dependency.nodePath,
        "yarn",
        "lib",
        "cli",
      )} add ${depString} ${
        spec.type === "git" ? "" : "--ignore-scripts"
      } --no-lockfile --non-interactive --no-bin-links --ignore-engines --skip-integrity-check --cache-folder ./ --registry=http://registry.m.jd.com`,
      (err, stdout, stderr) => {
        if (err) {
          reject(
            err.message.indexOf("versions") >= 0
              ? new Error("INVALID_VERSION")
              : err,
          );
        } else {
          resolve(null);
        }
      },
    );
  });
}
