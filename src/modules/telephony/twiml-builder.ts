import twilio from "twilio";

export interface TwiMLMedicationPromptOptions {
  patientName: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  actionUrl: string;
  preferredLanguage?: string;
  voiceSpeed?: "NORMAL" | "SLOW";
}

export class TwiMLBuilder {
  /**
   * Builds accessible, crystal-clear TwiML for an automated senior medication reminder call.
   * Utilizes Amazon Polly Joanna voice with adjustable speech pacing.
   */
  static buildMedicationReminderPrompt(options: TwiMLMedicationPromptOptions): string {
    const response = new twilio.twiml.VoiceResponse();
    const rate = options.voiceSpeed === "SLOW" ? "85%" : "95%";
    const language = options.preferredLanguage || "en-US";

    const gather = response.gather({
      numDigits: 1,
      action: options.actionUrl,
      method: "POST",
      timeout: 10,
    });

    const promptText = `
      Hello ${options.patientName}. This is CareNest, your care reminder assistant.
      This is a reminder that it is time for your scheduled medication: ${options.medicationName}, ${options.dosage}.
      ${options.instructions ? `Instructions: ${options.instructions}.` : ""}
      Have you taken it?
      Press 1 if you have taken it.
      Press 2 if you have not taken it yet.
      Press 3 to be reminded again in 15 minutes.
      Press 4 to connect with your caregiver.
    `;

    gather.say(
      {
        voice: "Polly.Joanna",
        language: language as any,
      },
      `<prosody rate="${rate}">${promptText}</prosody>`
    );

    // If caller didn't press anything within 10 seconds, repeat briefly then conclude
    response.say(
      { voice: "Polly.Joanna", language: language as any },
      `<prosody rate="${rate}">We did not receive a response. CareNest will check back with you shortly. Goodbye!</prosody>`
    );
    response.hangup();

    return response.toString();
  }

  /**
   * Generates TwiML response after digit 1 (Dose Taken).
   */
  static buildDoseConfirmedResponse(patientName: string): string {
    const response = new twilio.twiml.VoiceResponse();
    response.say(
      { voice: "Polly.Joanna", language: "en-US" },
      `<prosody rate="90%">Thank you ${patientName}! We have recorded your medication as taken. Keep up the wonderful work and have a great day!</prosody>`
    );
    response.hangup();
    return response.toString();
  }

  /**
   * Generates TwiML response after digit 2 (Not Taken Yet).
   */
  static buildNotTakenResponse(patientName: string): string {
    const response = new twilio.twiml.VoiceResponse();
    response.say(
      { voice: "Polly.Joanna", language: "en-US" },
      `<prosody rate="90%">Thank you for letting us know, ${patientName}. Please remember to take your medication with your meal when ready. CareNest will check in with you later.</prosody>`
    );
    response.hangup();
    return response.toString();
  }

  /**
   * Generates TwiML response after digit 3 (Snooze 15 minutes).
   */
  static buildSnoozeResponse(patientName: string): string {
    const response = new twilio.twiml.VoiceResponse();
    response.say(
      { voice: "Polly.Joanna", language: "en-US" },
      `<prosody rate="90%">No problem, ${patientName}. We will snooze this reminder and check back with you in 15 minutes. Take care!</prosody>`
    );
    response.hangup();
    return response.toString();
  }

  /**
   * Generates TwiML response after digit 4 (Bridge to Caregiver).
   */
  static buildCaregiverTransferResponse(caregiverPhone: string, caregiverName?: string): string {
    const response = new twilio.twiml.VoiceResponse();
    response.say(
      { voice: "Polly.Joanna", language: "en-US" },
      `<prosody rate="90%">Connecting you directly to your caregiver ${caregiverName || ""} now. Please stay on the line.</prosody>`
    );
    response.dial(caregiverPhone);
    return response.toString();
  }

  /**
   * Generates TwiML response for unrecognized digit input.
   */
  static buildInvalidDigitResponse(actionUrl: string): string {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      numDigits: 1,
      action: actionUrl,
      method: "POST",
      timeout: 8,
    });
    gather.say(
      { voice: "Polly.Joanna", language: "en-US" },
      `<prosody rate="90%">Sorry, that was not a recognized option. Please press 1 if you have taken your medication, press 2 for not taken, press 3 to snooze, or press 4 for your caregiver.</prosody>`
    );
    response.hangup();
    return response.toString();
  }
}
