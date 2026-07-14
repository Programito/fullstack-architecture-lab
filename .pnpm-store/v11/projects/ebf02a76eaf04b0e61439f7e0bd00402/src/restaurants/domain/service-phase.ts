import type { ServiceOrderLineStatus, ServicePhaseCourse, ServicePhaseStatus } from './service-floor.models';

type ServiceLinePhaseInput = {
  status: ServiceOrderLineStatus;
  course: Exclude<ServicePhaseCourse, 'mixed' | 'none'>;
};

function isActiveLine(status: ServiceOrderLineStatus): boolean {
  return status !== 'served' && status !== 'cancelled';
}

export function deriveServicePhase(
  lines: ServiceLinePhaseInput[],
): { course: ServicePhaseCourse; status: ServicePhaseStatus } {
  const activeLines = lines.filter((line) => isActiveLine(line.status));

  if (activeLines.length === 0) {
    return { course: 'none', status: 'no_order' };
  }

  const courses = [...new Set(activeLines.map((line) => line.course))];
  const course = courses.length === 1 ? courses[0]! : 'mixed';

  if (activeLines.some((line) => line.status === 'preparing' || line.status === 'picked_up')) {
    return { course, status: 'in_progress' };
  }

  if (activeLines.some((line) => line.status === 'ready')) {
    return { course, status: 'ready' };
  }

  if (activeLines.some((line) => line.status === 'pending' || line.status === 'sent_to_kitchen')) {
    return { course, status: 'pending' };
  }

  return { course, status: 'served' };
}

export function getServiceDurationMinutes(occupiedAt: string | null, serviceStartedAt: string | null, now = new Date()): number {
  const anchor = occupiedAt ?? serviceStartedAt;

  if (!anchor) {
    return 0;
  }

  const diff = now.getTime() - new Date(anchor).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}
