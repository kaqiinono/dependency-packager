import { Callback, Context } from "aws-lambda";
import { fs } from "mz";
import fetch from "node-fetch";
import * as path from "path";
import { join } from "path";
import * as Raven from "raven";
import * as rimraf from "rimraf";
import { fetchBuiltinComponentStyle } from "./dependencies/fetch-builtin-component-style";
import findDependencyDependencies from "./dependencies/find-dependency-dependencies";
import installDependencies from "./dependencies/install-dependencies";

import findPackageInfos, { IPackage } from "./packages/find-package-infos";
import findRequires, { IFileData } from "./packages/find-requires";
import getHash from "./utils/get-hash";


async function getContents(
  dependency: any,
  packagePath: string,
  packageInfos: { [p: string]: IPackage },
): Promise<IFileData> {
  const contents = await findRequires(
    dependency,
    packagePath,
    packageInfos,
  );

  const packageJSONFiles = Object.keys(packageInfos).reduce(
    (total, next) => ({
      ...total,
      [next.replace(packagePath, "")]: {
        content: JSON.stringify(packageInfos[next]),
      },
    }),
    {},
  );

  // // Hardcoded deletion of some modules that are not used but added by accident
  // deleteHardcodedRequires(
  //   contents,
  //   "/node_modules/react/cjs/react.production.min.js",
  // );
  // deleteHardcodedRequires(
  //   contents,
  //   "/node_modules/react-dom/cjs/react-dom.production.min.js",
  // );

  return { ...contents, ...packageJSONFiles };
}

/**
 * Delete `module` field if the module doesn't exist at all
 */
function verifyModuleField(pkg: IPackage, pkgLoc: string) {
  if (!pkg.module) {
    return;
  }

  try {
    const basedir = path.dirname(pkgLoc);

    const found = [
      path.join(basedir, pkg.module),
      path.join(basedir, pkg.module, "index.js"),
      path.join(basedir, pkg.module, "index.mjs"),
    ].find((p) => {
      try {
        const l = fs.statSync(p);
        return l.isFile();
      } catch (e) {
        return false;
      }
    });

    if (!found) {
      pkg.csbInvalidModule = pkg.module;
      delete pkg.module;
    }
  } catch (e) {
    /* */
  }
}

let packaging = false;

export async function call(event: any, context: Context, cb: Callback) {
  /** Immediate response for WarmUP plugin */
  if (event.source === "serverless-plugin-warmup") {
    console.log("WarmUP - Lambda is warm!");
    return cb(undefined, "Lambda is warm!");
  }

  const dependency = event;
  const hash = getHash(dependency);
  const t = Date.now();

  if (!hash) {
    return;
  }
  if (!dependency) {
    return;
  }

  const packagePath = path.join("/tmp", hash);

  // Cleanup!
  if (!packaging) {
    console.log("Cleaning up /tmp");
    try {
      const folders = fs.readdirSync("/tmp");

      folders.forEach((f) => {
        const p = path.join("/tmp/", f);
        try {
          if (fs.statSync(p).isDirectory() && p !== "/tmp/git") {
            rimraf.sync(p);
          }
        } catch (e) {
          console.error("Could not delete " + p + ", " + e.message);
        }
      });
    } catch (e) {
      console.error("Could not delete dependencies: " + e.message);
      console.log("Continuing packaging...");
    }
  }

  packaging = true;
  try {
    await installDependencies(dependency, packagePath);

    const packageInfos = await findPackageInfos(dependency.name, packagePath);

    Object.keys(packageInfos).map((pkgJSONPath) => {
      const pkg = packageInfos[pkgJSONPath];

      verifyModuleField(pkg, pkgJSONPath);
    });

    const contents = await getContents(dependency, packagePath, packageInfos);

    console.log(
      "Done - " +
      (Date.now() - t) +
      " - " +
      dependency.name +
      "@" +
      dependency.version,
    );

    const requireStatements = new Set<string>();
    Object.keys(contents).forEach((p) => {
      const c = contents[p];

      if (c.requires) {
        c.requires.forEach((r) => requireStatements.add(r));
      }
    });

    const dependencyDependencies = findDependencyDependencies(
      dependency,
      packagePath,
      packageInfos,
      requireStatements,
      contents,
    );

    // 针对私有组件，将组件样式文件也写到返回给浏览器的 manifest.json 文件中
    fetchBuiltinComponentStyle(
      contents,
      dependency.name,
      packagePath,
      dependencyDependencies,
    );

    const css = contents[join(`/node_modules/${dependency.name}`, dependency.css)];
    if (dependency.css && css) {
      // sandbox-client会自动读取dist目录下的index.css文件作为主要样式进行自动引入
      contents[`/node_modules/${dependency.name}/dist/index.css`] = css;
    }
    const response = {
      contents,
      dependency,
      ...dependencyDependencies,
    };

    // Cleanup
    try {
      rimraf.sync(packagePath);
    } catch (e) {
      /* ignore */
    }

    cb(undefined, response);
  } catch (e) {
    // Cleanup
    try {
      rimraf.sync(packagePath);
    } catch (e) {
      /* ignore */
    }

    console.error("ERROR", e);

    Raven.captureException(e, {
      tags: {
        hash,
        dependency: `${dependency.name}@${dependency.version}`,
      },
    });

    if (process.env.IN_LAMBDA) {
      // We try to call fly, which is a service with much more disk space, retry with this.
      try {
        const responseFromFly = await fetch(
          `https://dependency-packager.fly.dev/${dependency.name}@${dependency.version}`,
        ).then((x) => x.json());

        if (responseFromFly.error) {
          throw new Error(responseFromFly.error);
        }

        cb(undefined, responseFromFly);
      } catch (ee) {
        cb(undefined, { error: e.message });
      }
    } else {
      cb(undefined, { error: e.message });
    }
  } finally {
    packaging = false;
  }
}

//
// call({
//   name: "@jd/jmtd",
//   version: "latest",
//   css: "dist/themes/datamill.css",
//   nodePath: path.resolve(__dirname, "../../node_modules"),
// }, {} as any, (err, result) => {
//   console.log(err);
//   // s3.saveResult(result);
//   // console.log(result);
// });


export default call;
