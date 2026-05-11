import { Box, Typography } from '@mui/material';
import type { DocumentLinkedTaskBrief } from '@/api/types';
import {
  documentLinkedTaskStatusLabel,
  documentLinkedTaskTypeLabel,
} from '@/utils/documentRelatedTasks';

export function DocumentRelatedTasksCell({ tasks }: { tasks: DocumentLinkedTaskBrief[] | undefined }) {
  const list = tasks ?? [];
  if (!list.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.5, minWidth: 0 }}>
      {list.map((t, i) => {
        const typeL = documentLinkedTaskTypeLabel(t.type);
        const statusL = documentLinkedTaskStatusLabel(t.status);
        return (
          <Typography
            key={t.id}
            variant="caption"
            sx={{ lineHeight: 1.35, display: 'block' }}
            title={`${typeL} (${statusL}) — #${t.id} to ten sam identyfikator co w module Zadania`}
          >
            <Box component="span" sx={{ fontWeight: 700 }}>
              {i + 1}.
            </Box>{' '}
            #{t.id} · {typeL} · {statusL}
          </Typography>
        );
      })}
    </Box>
  );
}

export function DocumentRelatedTasksDetailSection({
  tasks,
}: {
  tasks: DocumentLinkedTaskBrief[] | undefined;
}) {
  const list = tasks ?? [];
  return (
    <>
      <Typography variant="subtitle2" fontWeight={600}>
        Powiązane zadania
      </Typography>
      {list.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Brak.
        </Typography>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Numery 1., 2., … — kolejność na tej liście; #id — identyfikator w module Zadania (spójny z
            aplikacją mobilną).
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {list.map((t, i) => {
              const typeL = documentLinkedTaskTypeLabel(t.type);
              const statusL = documentLinkedTaskStatusLabel(t.status);
              return (
                <Typography key={t.id} variant="body2" sx={{ lineHeight: 1.4 }}>
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {i + 1}.
                  </Box>{' '}
                  #{t.id} · {typeL} · {statusL}
                </Typography>
              );
            })}
          </Box>
        </>
      )}
    </>
  );
}
