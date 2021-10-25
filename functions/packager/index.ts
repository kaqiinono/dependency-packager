import { fs } from "mz";
import * as path from "path";
import * as rimraf from "rimraf";

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
    dependency.name,
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

export async function call(event: any, context: any, cb: any) {
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

      folders.forEach((f:any) => {
        const p = path.join("/tmp/", f);
        try {
          if (fs.statSync(p).isDirectory() && p !== "/tmp/git") {
            rimraf.sync(p);
          }
        } catch (e) {
          console.error("Could not delete " + p + ", " + (e as Error).message);
        }
      });
    } catch (e) {
      console.error("Could not delete dependencies: " + (e as Error).message);
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

    const response = {
      contents,
      dependency,
      ...findDependencyDependencies(
        dependency,
        packagePath,
        packageInfos,
        requireStatements,
        contents,
      ),
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
    packaging = false;
  }
}

// const PORT = process.env.PORT || 4545;
//
// /* tslint:disable no-var-requires */
// const express = require("express");
// /* tslint:enable */
//
// const app = express();
//
// app.get("/*", (req: any, res: any) => {
//   const packageParts = req.url.replace("/", "").split("@");
//   const version = packageParts.pop();
//
//   const ctx = {} as any;
//   const dep = { name: packageParts.join("@"), version };
//
//   console.log(dep);
//   call(dep, ctx, (err: any, result: any) => {
//     console.log(err);
//
//     // const size = {};
//
//     // console.log(result.contents);
//
//     // Object.keys(result.contents).forEach(p => {
//     //   size[p] =
//     //     result.contents[p].content && result.contents[p].content.length;
//     // });
//
//     if (result.error) {
//       res.status(422).json(result);
//     } else {
//       res.json(result);
//     }
//   });
// });
//
// app.listen(PORT, () => {
//   console.log("Listening on " + PORT);
// });
