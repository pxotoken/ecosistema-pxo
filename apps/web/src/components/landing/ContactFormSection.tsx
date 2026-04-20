import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { useContactEmail } from "../../hooks/useContactEmail";

export const ContactFormSection: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    message: "",
  });
  const { loading, error, success, sendContactEmail, clearStatus } =
    useContactEmail();

  useEffect(() => {
    if (success) {
      setFormData({ email: "", message: "" });

      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        clearStatus();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await sendContactEmail(formData);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section id="contacto" className="py-20 bg-gray-50 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Do you have questions or proposals?
          </h2>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pxo-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                rows={6}
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                minLength={10}
                maxLength={5000}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pxo-primary focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Tell us more details..."
              ></textarea>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  Message sent successfully! We'll get back to you soon.
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  {error || "Failed to send message. Please try again."}
                </span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-pxo-primary text-white py-4 rounded-xl font-semibold hover:bg-pxo-secondary transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Message"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};
