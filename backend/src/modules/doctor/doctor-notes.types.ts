export type DoctorNoteResponse = {
  id: string;
  patientId: string;
  doctorId: string | null;
  note: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorNotesResponse = {
  notes: DoctorNoteResponse[];
};

export type CreateDoctorNoteInput = {
  note: string;
};

export type CreateDoctorNoteResponse = {
  note: DoctorNoteResponse;
};