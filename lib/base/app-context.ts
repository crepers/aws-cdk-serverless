import fs = require('fs');
import { App } from 'aws-cdk-lib';

export interface AppContextProps {
    appConfigEnvName?: string;
    projectPrefix: string;
}

export class AppContext {
  private projectPrefix: string|undefined;
  public readonly cdkApp: App;
  public readonly appConfig: any|undefined;
  public readonly appConfigEnvName : string;

  constructor(props: AppContextProps) {
    this.cdkApp = new App();
    this.projectPrefix = props.projectPrefix;
    
    const fs = require('fs');
    
    if (!process.env.APP_CONFIG) {
        console.error(`==> CDK App-Config File is empty, 
            please check your environment variable(Usage: export APP_CONFIG=dev)`);
    } else {
        this.appConfigEnvName = process.env.APP_CONFIG ? process.env.APP_CONFIG : 'dev';
        this.appConfig = JSON.parse(fs.readFileSync(`config/${this.appConfigEnvName}.json`).toString());
        console.info(`==> CDK App-Config Environment is ${this.appConfigEnvName}.`);
    }
    
    if(this.appConfig) {
        // other works        
        // console.log(this.appConfig);
    }
  }
}
