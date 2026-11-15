import { z } from "zod";

export const CreateAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID"),
  title: z.string().min(2, "Appointment title is required (e.g. Cardiology Check-up)"),
  appointmentDatetime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid appointment ISO datetime format",
  }),
  durationMinutes: z.number().int().min(15).max(360).default(45),
  locationAddress: z.string().min(3, "Location address is required"),
  transportBooked: z.boolean().default(false),
  transportServiceName: z.string().optional(),
  transportPickupTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid pickup datetime format",
  }).optional(),
  transportNotes: z.string().optional(),
  visitNotes: z.string().optional(),
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
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;
