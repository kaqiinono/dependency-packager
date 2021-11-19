import {fs} from "mz";
import { join } from "path";

class S3 {
  public putObject(params: any, callback: (e: any) => void): void {
    fs.writeFileSync(join('/tmp','putObject.json'), JSON.stringify(params))
  };

  public saveResult(params: any): void {
    fs.writeFileSync(join(__dirname,'saveResult.json'), JSON.stringify(params))
  }
}

export default S3;
