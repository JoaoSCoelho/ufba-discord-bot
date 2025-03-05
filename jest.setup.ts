
if (process.env.PERSIST_LOGS === 'true' || process.env.VIEW_LOGS === 'true')
    global.console = jest.requireActual('console');

import * as logModule from './src/classes/LogSystem'; // Importa normalmente

jest.spyOn(logModule.log, 'loading');
jest.spyOn(logModule.log, 'loadingh');
jest.spyOn(logModule.log, 'success');
jest.spyOn(logModule.log, 'successh');
jest.spyOn(logModule.log, 'warn');
jest.spyOn(logModule.log, 'warnh');
jest.spyOn(logModule.log, 'info');
jest.spyOn(logModule.log, 'infoh');
jest.spyOn(logModule.log, 'error');
jest.spyOn(logModule.log, 'errorh');
jest.spyOn(logModule.log, 'other');
jest.spyOn(logModule.log, 'otherh');
