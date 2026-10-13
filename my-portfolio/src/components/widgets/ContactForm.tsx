import React, { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { AlertCircle, CheckCircle2, ArrowUpRight } from 'lucide-react';

const ContactForm: React.FC = () => {
    const form = useRef<HTMLFormElement>(null);
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [formData, setFormData] = useState({
        user_name: '',
        user_email: '',
        message: '',
        website: '' // Honeypot field
    });
    // Bots submit instantly; people take a few seconds
    const [startTime] = useState(() => Date.now());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const sendEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.website) {
            setStatus('success');
            return;
        }

        if (Date.now() - startTime < 2000) {
            setStatus('error');
            setErrorMessage("Please take a moment before sending.");
            return;
        }

        if (!formData.user_name || !formData.user_email || !formData.message) {
            setStatus('error');
            setErrorMessage("Please fill in all fields.");
            return;
        }

        setStatus('sending');

        try {
            await emailjs.sendForm(
                import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_id',
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_id',
                form.current!,
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'public_key'
            );
            setStatus('success');
        } catch (error) {
            console.error('EmailJS Error:', error);
            setStatus('error');
            setErrorMessage("Couldn't send your message. Try the alternate form instead.");
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-md rounded-2xl border border-line p-5 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                    <h3 className="text-[15px] font-medium text-fg">Message sent</h3>
                    <p className="text-sm text-muted">I'll get back to you soon.</p>
                </div>
            </div>
        );
    }

    const inputClass = 'w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-base text-fg placeholder:text-subtle focus:border-line-strong outline-none transition-colors disabled:opacity-50';

    return (
        <div className="w-full max-w-md rounded-2xl border border-line p-5">
            <h3 className="text-[15px] font-medium text-fg">Get in touch</h3>
            <p className="text-sm text-muted mb-4">Usually replies within a day.</p>

            <form ref={form} onSubmit={sendEmail} className="space-y-2.5">
                {/* Honeypot */}
                <div className="hidden">
                    <input type="text" name="website" value={formData.website} onChange={handleChange} tabIndex={-1} autoComplete="off" />
                </div>

                <input type="text" name="user_name" placeholder="Your name" value={formData.user_name} onChange={handleChange} className={inputClass} disabled={status === 'sending'} />
                <input type="email" name="user_email" placeholder="you@email.com" value={formData.user_email} onChange={handleChange} className={inputClass} disabled={status === 'sending'} />
                <textarea name="message" placeholder="What's on your mind?" rows={4} value={formData.message} onChange={handleChange} className={`${inputClass} resize-none`} disabled={status === 'sending'} />

                {status === 'error' && (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" />
                        <div>
                            <p>{errorMessage}</p>
                            <a
                                href="https://mirang.framer.ai/form-submit"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-muted hover:text-fg underline underline-offset-2"
                            >
                                Alternate form <ArrowUpRight size={13} />
                            </a>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full rounded-full bg-fg text-bg py-2.5 text-sm font-medium hover:opacity-85 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                    {status === 'sending' && <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                    {status === 'sending' ? 'Sending' : 'Send message'}
                </button>
            </form>
        </div>
    );
};

export default ContactForm;
