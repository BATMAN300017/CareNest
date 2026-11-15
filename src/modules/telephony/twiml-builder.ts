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
   * Utilizes Amazon Polly Joanna (English) or Polly Aditi (Hindi) with adjustable speech pacing.
   */
  static buildMedicationReminderPrompt(options: TwiMLMedicationPromptOptions): string {
    const response = new twilio.twiml.VoiceResponse();
    const rate = options.voiceSpeed === "SLOW" ? "85%" : "95%";
    const isHindi = options.preferredLanguage === "hi" || options.preferredLanguage === "hi-IN";
    const language = isHindi ? "hi-IN" : "en-US";
    const voice = isHindi ? "Polly.Aditi" : "Polly.Joanna";

    const gather = response.gather({
      numDigits: 1,
      action: options.actionUrl,
      method: "POST",
      timeout: 10,
    });

    const promptText = isHindi
      ? `नमस्ते ${options.patientName}। यह केयरनेस्ट से आपकी निर्धारित दवा का स्वचालित स्मरण संदेश है। आपकी दवा ${options.medicationName}, ${options.dosage} लेने का समय हो गया है। ${options.instructions ? `निर्देश: ${options.instructions}।` : ""} क्या आपने यह दवा ले ली है? दवा ले ली है तो 1 दबाएँ। अगर अभी नहीं ली है तो 2 दबाएँ। 15 मिनट बाद याद दिलाने के लिए 3 दबाएँ। अपने देखभालकर्ता से बात करने के लिए 4 दबाएँ।`
      : `Hello ${options.patientName}. This is CareNest, your care reminder assistant. This is a reminder that it is time for your scheduled medication: ${options.medicationName}, ${options.dosage}. ${options.instructions ? `Instructions: ${options.instructions}.` : ""} Have you taken it? Press 1 if you have taken it. Press 2 if you have not taken it yet. Press 3 to be reminded again in 15 minutes. Press 4 to connect with your caregiver.`;

    gather.say(
      {
        voice: voice as any,
        language: language as any,
      },
      `<prosody rate="${rate}">${promptText}</prosody>`
    );

    const noResponseText = isHindi
      ? `हमें आपकी प्रतिक्रिया नहीं मिली। केयरनेस्ट आपसे शीघ्र ही दोबारा संपर्क करेगा। धन्यवाद और अलविदा!`
      : `We did not receive a response. CareNest will check back with you shortly. Goodbye!`;

    response.say(
      { voice: voice as any, language: language as any },
      `<prosody rate="${rate}">${noResponseText}</prosody>`
    );
    response.hangup();

    return response.toString();
  }

  /**
   * Generates TwiML response after digit 1 (Dose Taken).
   */
  static buildDoseConfirmedResponse(patientName: string, lang = "en-US"): string {
    const response = new twilio.twiml.VoiceResponse();
    const isHindi = lang === "hi" || lang === "hi-IN";
    const voice = isHindi ? "Polly.Aditi" : "Polly.Joanna";
    const language = isHindi ? "hi-IN" : "en-US";

    const text = isHindi
      ? `धन्यवाद ${patientName}! हमने दर्ज कर लिया है कि आपने अपनी दवा ले ली है। आपका दिन शुभ और स्वस्थ रहे!`
      : `Thank you ${patientName}! We have recorded your medication as taken. Keep up the wonderful work and have a great day!`;

    response.say(
      { voice: voice as any, language: language as any },
      `<prosody rate="90%">${text}</prosody>`
    );
    response.hangup();
    return response.toString();
  }

  /**
   * Generates TwiML response after digit 2 (Not Taken Yet).
   */
  static buildNotTakenResponse(patientName: string, lang = "en-US"): string {
    const response = new twilio.twiml.VoiceResponse();
    const isHindi = lang === "hi" || lang === "hi-IN";
    const voice = isHindi ? "Polly.Aditi" : "Polly.Joanna";
    const language = isHindi ? "hi-IN" : "en-US";

    const text = isHindi
      ? `हमें बताने के लिए धन्यवाद, ${patientName}। कृपया समय पर भोजन के साथ अपनी दवा लेना न भूलें। केयरनेस्ट आपसे बाद में फिर संपर्क करेगा।`
      : `Thank you for letting us know, ${patientName}. Please remember to take your medication with your meal when ready. CareNest will check in with you later.`;

    response.say(
      { voice: voice as any, language: language as any },
      `<prosody rate="90%">${text}</prosody>`
    );
    response.hangup();
    return response.toString();
  }

  /**
   * Generates TwiML response after digit 3 (Snooze 15 minutes).
   */
  static buildSnoozeResponse(patientName: string, lang = "en-US"): string {
    const response = new twilio.twiml.VoiceResponse();
    const isHindi = lang === "hi" || lang === "hi-IN";
    const voice = isHindi ? "Polly.Aditi" : "Polly.Joanna";
    const language = isHindi ? "hi-IN" : "en-US";

    const text = isHindi
      ? `कोई बात नहीं, ${patientName}। हमने यह रिमाइंडर 15 मिनट के लिए स्थगित कर दिया है। अपना ध्यान रखें!`
      : `No problem, ${patientName}. We will snooze this reminder and check back with you in 15 minutes. Take care!`;

    response.say(
      { voice: voice as any, language: language as any },
      `<prosody rate="90%">${text}</prosody>`
    );
    response.hangup();
    return response.toString();
  }

  /**
   * Generates TwiML response after digit 4 (Bridge to Caregiver).
   */
  static buildCaregiverTransferResponse(caregiverPhone: string, caregiverName?: string, lang = "en-US"): string {
    const response = new twilio.twiml.VoiceResponse();
    const isHindi = lang === "hi" || lang === "hi-IN";
    const voice = isHindi ? "Polly.Aditi" : "Polly.Joanna";
    const language = isHindi ? "hi-IN" : "en-US";

    const text = isHindi
      ? `आपको आपके देखभालकर्ता ${caregiverName || ""} से सीधे जोड़ा जा रहा है। कृपया लाइन पर बने रहें।`
      : `Connecting you directly to your caregiver ${caregiverName || ""} now. Please stay on the line.`;

    response.say(
      { voice: voice as any, language: language as any },
      `<prosody rate="90%">${text}</prosody>`
    );
    response.dial(caregiverPhone);
    return response.toString();
  }

  /**
   * Generates TwiML response for unrecognized digit input.
   */
  static buildInvalidDigitResponse(actionUrl: string, lang = "en-US"): string {
    const response = new twilio.twiml.VoiceResponse();
    const isHindi = lang === "hi" || lang === "hi-IN";
    const voice = isHindi ? "Polly.Aditi" : "Polly.Joanna";
    const language = isHindi ? "hi-IN" : "en-US";

    const gather = response.gather({
      numDigits: 1,
      action: actionUrl,
      method: "POST",
      timeout: 8,
    });

    const text = isHindi
      ? `क्षमा करें, यह कोई मान्य विकल्प नहीं था। अगर दवा ले ली है तो 1 दबाएँ, नहीं ली है तो 2 दबाएँ, 15 मिनट बाद के लिए 3 दबाएँ, या देखभालकर्ता से बात करने के लिए 4 दबाएँ।`
      : `Sorry, that was not a recognized option. Please press 1 if you have taken your medication, press 2 for not taken, press 3 to snooze, or press 4 for your caregiver.`;

    gather.say(
      { voice: voice as any, language: language as any },
      `<prosody rate="90%">${text}</prosody>`
    );
    response.hangup();
    return response.toString();
  }
}
