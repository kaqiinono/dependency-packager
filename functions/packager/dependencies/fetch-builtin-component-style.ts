import { fs } from "mz";
import { join } from "path";

const isBuiltinComponent = (pkgName: string) => /^(@jd)\/.*/.test(pkgName);

// 根据组件 npm 包名以及通过 yarn 下载到磁盘上的 npm 包路径，读入对应的样式文件内容，并写入到 manifest.json 的 contents 对象上
const insertStyle = (contents: any, packageName: string, packagePath: string) => {
  const stylePath = `node_modules/${packageName}/dist/index.css`;
  const styleFilePath = join(
    packagePath,
    `node_modules/${packageName}/dist/index.css` ,
  );
  if (fs.existsSync(styleFilePath)) {
    contents[stylePath] = {
      contents: fs.readFileSync(styleFilePath, "utf-8"),
      isModule: false,
    };
  }
};
// 获取内建组件的样式文件，并写入到返回给 Sandbox 的 manifest.json 文件中
export const fetchBuiltinComponentStyle = (
  contents: any,
  packageName: string,
  packagePath: string,
  dependencyDependencies: any,
) => {
  // 当 npm 包或者其依赖以及依赖的依赖中有内建组件，则将该内建组件对应的样式文件写入到 manifest.json 文件中
  if (isBuiltinComponent(packageName)) {
    insertStyle(contents, packageName, packagePath);
  }
  Object.keys(dependencyDependencies.dependencyDependencies).forEach(
    (pkgName) => {
      if (isBuiltinComponent(pkgName)) {
        insertStyle(contents, pkgName, packagePath);
      }
    },
  );
};
