import { LangConfig } from '@hydrooj/utils/lib/lang';
import { STATUS } from '@hydrooj/utils/lib/status';
import { CompileError } from './error';
import { Execute } from './interface';
import {
    CopyIn, CopyInFile, del, runQueued,
} from './sandbox';
import { compilerText } from './utils';

export default async function compile(
    lang: LangConfig, code: CopyInFile, copyIn: CopyIn = {}, next?: Function,
): Promise<Execute> {
    const target = lang.target || 'foo';
    const execute = copyIn['execute.sh'] ? '/bin/bash execute.sh' : lang.execute;
    if (lang.compile) {
        const {
            status, stdout, stderr, fileIds,
        } = await runQueued(
            copyIn['compile.sh'] ? '/bin/bash compile.sh' : lang.compile,
            {
                copyIn: { ...copyIn, [lang.code_file]: code },
                copyOutCached: [target],
                env: { HYDRO_LANG: lang.key },
                time: lang.compile_time_limit || 10000,
                memory: lang.compile_memory_limit || 256,
            },
            `compile[${lang.key}]`,
            3,
        );
        // TODO: distinguish user program and checker
        if (status === STATUS.STATUS_TIME_LIMIT_EXCEEDED) next?.({ message: 'Compile timeout.' });
        if (status === STATUS.STATUS_MEMORY_LIMIT_EXCEEDED) next?.({ message: 'Compile memory limit exceeded.' });
        if (status !== STATUS.STATUS_ACCEPTED) throw new CompileError({ status, stdout, stderr });
        if (!fileIds[target]) throw new CompileError({ stderr: 'Executable file not found.' });
        next?.({ compilerText: compilerText(stdout, stderr) });
        return {
            execute,
            copyIn: { ...copyIn, [target]: { fileId: fileIds[target] } },
            clean: () => del(fileIds[target]),
        };
    }
    return {
        execute,
        copyIn: { ...copyIn, [lang.code_file]: code },
        clean: () => Promise.resolve(null),
    };
}
