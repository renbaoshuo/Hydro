import { Suspense, useMemo, useSyncExternalStore } from 'react';
import { usePageData } from './context/page-data';
import { defineSlot, SlotName } from './registry';
import { SlotErrorBoundary } from './registry/error-boundary';
import { store } from './registry/store';

const App = defineSlot('app:root', () => {
  const { name, template } = usePageData();
  const renderTemplate = template || name;
  const slotName: SlotName = `page:${renderTemplate}`;

  const [subscribe, getSnapshot] = useMemo(() => [
    (cb: () => void) => store.subscribe(slotName, cb),
    () => store.getVersion(slotName),
  ], [slotName]);

  useSyncExternalStore(subscribe, getSnapshot);

  const Comp = store.getDefault(slotName);

  if (!Comp) {
    return (
      <div>
        Page not found: <code>{name} ({renderTemplate})</code>
      </div>
    );
  }

  return (
    <SlotErrorBoundary slotName={slotName} label="renderer">
      <Suspense fallback={<div>Loading...</div>}>
        <Comp />
      </Suspense>
    </SlotErrorBoundary>
  );
});

export default App;
