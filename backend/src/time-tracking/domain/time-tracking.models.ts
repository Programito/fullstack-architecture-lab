export type TimeEntryStatus = 'open' | 'closed' | 'corrected';
export type TimeEntryChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export type TimeEntry = {
  id: string;
  userId: string;
  restaurantId: string;
  clockInAt: string;
  clockOutAt: string | null;
  clockInNote: string | null;
  clockOutNote: string | null;
  status: TimeEntryStatus;
  createdAt: string;
  updatedAt: string;
};

export type TimeEntryView = {
  entry: TimeEntry;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type TimeEntryChangeRequestView = {
  id: string;
  restaurantId: string;
  status: TimeEntryChangeRequestStatus;
  reason: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  requestedClockInNote: string | null;
  requestedClockOutNote: string | null;
  timeEntry: TimeEntryView;
  requestedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};
