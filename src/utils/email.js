// src/utils/email.js

// IMPORTANT: Replace these with your actual EmailJS credentials
// You can get these from your EmailJS Dashboard -> Account / Email Services
const EMAILJS_SERVICE_ID = 'service_5rcnc3s';
const EMAILJS_TEMPLATE_ID = 'template_0s7pnv8';
const EMAILJS_PUBLIC_KEY = 'F7Cjll_tmpaR_UTrf'; 

export const sendWelcomeEmail = async (userEmail, userPassword, role) => {
  if (!EMAILJS_SERVICE_ID) {
    console.warn("EmailJS credentials are not set. Email not sent.");
    return false;
  }

  const roleName = role === 'Mechanic' ? 'Mechanic' : 'Sales Representative';
  
  // These variables must match the {{variable_name}} in your EmailJS template!
  const templateParams = {
    email: userEmail,
    to_email: userEmail,
    userEmail: userEmail,       // Added to match the HTML template
    userPassword: userPassword, // Added to match the HTML template
    name: 'Shaan Cars Enterprise',
    email_subject: 'Welcome to Shaan Cars CRM - Your Login Credentials',
    role_name: roleName,
    user_password: userPassword,
    login_link: 'https://shaan-cars.vercel.app'
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams
      })
    });

    if (response.ok) {
      console.log("Welcome email sent successfully via EmailJS.");
      return true;
    } else {
      const errorText = await response.text();
      console.error("Failed to send email via EmailJS:", errorText);
      return false;
    }
  } catch (error) {
    console.error("Error sending email via EmailJS:", error);
    return false;
  }
};
