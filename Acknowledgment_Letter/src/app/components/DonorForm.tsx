import { UseFormReturn } from "react-hook-form";
import { LetterData } from "../App";
import { Plus, Trash2, Download, Save, Printer } from "lucide-react";

interface DonorFormProps {
  form: UseFormReturn<LetterData>;
  onGeneratePDF: () => void;
  onSaveDraft: () => void;
  onPrint: () => void;
}

export default function DonorForm({ form, onGeneratePDF, onSaveDraft, onPrint }: DonorFormProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const donations = watch("donations");

  const addDonation = () => {
    setValue("donations", [...donations, { date: "", amount: "" }]);
  };

  const removeDonation = (index: number) => {
    if (donations.length > 1) {
      setValue("donations", donations.filter((_, i) => i !== index));
    }
  };

  const donationTypes = [
    "Sponsor a Child",
    "General Donation",
    "Education Support",
    "Healthcare Support",
    "Infrastructure Development",
    "Emergency Relief",
    "Monthly Contribution",
    "Annual Contribution"
  ];

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label htmlFor="donorName" className="block mb-2 text-sm">
          Donor Name <span className="text-destructive">*</span>
        </label>
        <input
          id="donorName"
          type="text"
          {...register("donorName", { required: "Donor name is required" })}
          className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Enter donor's full name"
        />
        {errors.donorName && (
          <p className="mt-1 text-sm text-destructive">{errors.donorName.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm">
            Donation Details <span className="text-destructive">*</span>
          </label>
          <button
            type="button"
            onClick={addDonation}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add More
          </button>
        </div>

        <div className="space-y-3">
          {donations.map((_, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <input
                  type="date"
                  {...register(`donations.${index}.date` as const)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  {...register(`donations.${index}.amount` as const)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Amount (Tk.)"
                />
              </div>
              {donations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDonation(index)}
                  className="p-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="donationType" className="block mb-2 text-sm">
          Donation Type <span className="text-destructive">*</span>
        </label>
        <select
          id="donationType"
          {...register("donationType")}
          className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {donationTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="projectName" className="block mb-2 text-sm">
          Project Name
        </label>
        <input
          id="projectName"
          type="text"
          {...register("projectName")}
          className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="e.g., Child Education Initiative 2026"
        />
      </div>

      <div>
        <label htmlFor="message" className="block mb-2 text-sm">
          Additional Message / Notes
        </label>
        <textarea
          id="message"
          {...register("message")}
          rows={4}
          className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          placeholder="Add any special notes or personalized message..."
        />
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <button
          type="button"
          onClick={onGeneratePDF}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Generate & Download PDF
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </form>
  );
}
