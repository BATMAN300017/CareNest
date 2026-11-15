import { z } from "zod";

export const CreateAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID").optional().nullable(),
  doctorName: z.string().optional(),
  specialty: z.string().optional(),
  clinicName: z.string().optional(),
  contactPhone: z.string().optional(),
  title: z.string().min(2, "Appointment title is required (e.g. Cardiology Check-up)"),
  appointmentDatetime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid appointment ISO datetime format",
  }),
  timezone: z.string().default("UTC"),
  durationMinutes: z.number().int().min(15).max(360).default(45),
  locationAddress: z.string().min(3, "Location address is required"),
  transportBooked: z.boolean().default(false),
  transportServiceName: z.string().optional().nullable(),
  transportPickupTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid pickup datetime format",
  }).optional().nullable(),
  transportNotes: z.string().optional().nullable(),
  visitNotes: z.string().optional().nullable(),
  preparationInstructions: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
});

export const UpdateAppointmentSchema = z.object({
  doctorId: z.string().uuid().optional().nullable(),
  doctorName: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  clinicName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  title: z.string().min(2).optional(),
  appointmentDatetime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid appointment ISO datetime format",
  }).optional(),
  timezone: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(360).optional(),
  locationAddress: z.string().min(3).optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  transportBooked: z.boolean().optional(),
  transportServiceName: z.string().optional().nullable(),
  transportPickupTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid pickup datetime format",
  }).optional().nullable(),
  transportNotes: z.string().optional().nullable(),
  visitNotes: z.string().optional().nullable(),
  preparationInstructions: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
});

export const CancelAppointmentSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required"),
});

export const FilterAppointmentSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  upcoming: z.enum(["true", "false"]).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format",
  }).optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format",
  }).optional(),
});

export const CreateDoctorSchema = z.object({
  fullName: z.string().min(2, "Doctor full name is required"),
  specialty: z.string().min(2, "Medical specialty is required (e.g. Cardiologist, Primary Care)"),
  clinicName: z.string().min(2, "Clinic / Hospital name is required"),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    suite: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;
export type FilterAppointmentInput = z.infer<typeof FilterAppointmentSchema>;
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;
