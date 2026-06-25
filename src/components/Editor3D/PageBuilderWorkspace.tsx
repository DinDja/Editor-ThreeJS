'use client';

import PageExperience from './PageExperience';
import { useExperienceStore } from '@/store/experienceStore';

export default function PageBuilderWorkspace() {
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);

  return (
    <div className="h-full overflow-auto bg-[#0d0f10] p-5">
      <div className="mx-auto min-h-full w-full max-w-[1440px] overflow-hidden rounded-md border border-neutral-800 bg-[#101214] shadow-2xl">
        <PageExperience
          page={page}
          interactions={interactions}
          selectedNodeId={selectedPageNodeId}
          mode="edit"
          device="desktop"
          onSelectNode={setSelectedPageNode}
        />
      </div>
    </div>
  );
}
