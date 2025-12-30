import Schema from 'schemastery';
import { Context } from '../context';
import problem from '../model/problem';
import bus from '../service/bus';

export const apply = (ctx: Context) => ctx.addScript(
    'prefetchTestdata', 'prefetch testdata to judge clients',
    Schema.array(Schema.string()).default([]),
    async (args, report) => {
        const targets = args || [];
        for (const target of targets) {
            const [domainId, pid] = target.includes('#') ? target.split('#') : ['system', target];
            if (!domainId || !pid) {
                report({ message: `${target}: Invalid target` });
                continue;
            }
            // eslint-disable-next-line no-await-in-loop
            const pdoc = await problem.get(domainId, pid);
            if (!pdoc) {
                report({ message: `${target}: Problem not found` });
                continue;
            }
            const files = [...(pdoc.data || []), ...(pdoc.additional_file || [])];
            if (!files.length) {
                report({ message: `${target}: No files to prefetch` });
                continue;
            }
            report({ message: `${target}: Prefetching ${files.length} files` });
            bus.broadcast('judge/prefetch', `${domainId}/${pid}`, files);
        }
        return true;
    },
);
