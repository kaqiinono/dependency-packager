// import express, { Application, NextFunction, Request, Response } from "express";
import { call } from "../functions/packager/index";

// Boot express
// const app: Application = express();
// const port = 5000;

// // Application routing
// app.use("/", (req: Request, res: Response, next: NextFunction) => {
//   res.status(200).send({ data: "Hello from Ornio AS" });
// });

// app.use("/deps", (req: Request, res: Response, next: NextFunction) => {
const req = {
  url: "/react@16.10.2",
};
const packageParts = req.url.replace("/", "").split("@");
const version = packageParts.pop();

const ctx = {} as any;
const dep = { name: packageParts.join("@"), version };

console.log(dep);
call(dep, ctx, (err: any, result: any) => {
  console.log(err);

  // const size = {};

  // console.log(result.contents);

  // Object.keys(result.contents).forEach(p => {
  //   size[p] =
  //     result.contents[p].content && result.contents[p].content.length;
  // });

  // if (result.error) {
  //   res.status(422).json(result);
  // } else {
  //   res.json(result);
  // }
});
// });

// Start server
// app.listen(port, () => console.log(`Server is listening on port ${port}!`));
