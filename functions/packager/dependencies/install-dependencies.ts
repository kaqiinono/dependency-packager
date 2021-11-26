import {fs} from "mz";
import * as npa from "npm-package-arg";
import * as path from "path";
import * as shelljs from "shelljs";

export default function installDependencies(
  dependency: { name: string; version: string, nodePath: string },
  packagePath: string,
) {
  return new Promise((resolve, reject) => {
    const depString = `${dependency.name}@${dependency.version}`;

    const spec = npa(depString);

    let nodePath = dependency.nodePath;
    if (!nodePath || !fs.statSync(nodePath)) {
      nodePath = path.resolve(__dirname, '../../../node_modules');
      if (!fs.statSync(nodePath)) {
        debugger
        reject('node_modules folder is not found!')
      }
    }

    const run = shelljs.exec(
      `mkdir -p ${packagePath} && cd ${packagePath} && HOME=/tmp node ${path.join(
        nodePath,
        "yarn",
        "lib",
        "cli",
      )} add ${depString} ${
        spec.type === "git" ? "" : "--ignore-scripts"
      } --no-lockfile --non-interactive --no-bin-links --ignore-engines --skip-integrity-check --cache-folder ./ --registry=http://registry.m.jd.com`
    );
    if (run.code !== 0) {
      reject(run.stdout);
    } else {
      const pattr = new RegExp(`${dependency.name.replace('/','\/')}@(.*)`)
      const match = run.stdout.match(pattr);
      resolve(match && match[1]);
    }
  });
}
