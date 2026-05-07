import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "sonner";
import DonorForm from "./components/DonorForm";
import LetterPreview from "./components/LetterPreview";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Heart, FileText, History } from "lucide-react";

export interface DonationEntry {
  date: string;
  amount: string;
}

export interface LetterData {
  donorName: string;
  donations: DonationEntry[];
  donationType: string;
  projectName: string;
  message: string;
}

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [letterHistory, setLetterHistory] = useState<LetterData[]>([]);

  const form = useForm<LetterData>({
    defaultValues: {
      donorName: "",
      donations: [{ date: "", amount: "" }],
      donationType: "Sponsor a Child",
      projectName: "",
      message: ""
    }
  });

  const formData = form.watch();

  const handleGeneratePDF = () => {
    toast.success("Letter Generated Successfully!", {
      description: "Your acknowledgment letter is ready to download.",
      duration: 3000,
    });

    setLetterHistory(prev => [formData, ...prev.slice(0, 9)]);
  };

  const handleSaveDraft = () => {
    toast.info("Draft Saved", {
      description: "Your letter has been saved as a draft.",
      duration: 2000,
    });
  };

  const handlePrint = () => {
    window.print();
    toast.success("Printing...", {
      description: "Opening print dialog.",
      duration: 2000,
    });
  };

  const loadHistoryItem = (item: LetterData) => {
    form.reset(item);
    setShowHistory(false);
    toast.info("Letter Loaded", {
      description: "Previous letter data has been loaded.",
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" richColors />

      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl text-primary">Acknowledgment Letter Generator</h1>
              <p className="text-sm text-muted-foreground">Create professional donation acknowledgment letters</p>
            </div>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <History className="w-4 h-4" />
            <span>History ({letterHistory.length})</span>
          </button>
        </div>

        {showHistory && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-border p-4">
            <h3 className="mb-3">Recent Letters</h3>
            {letterHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history available yet.</p>
            ) : (
              <div className="space-y-2">
                {letterHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left px-3 py-2 bg-accent/50 hover:bg-accent rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.donorName || "Unnamed Donor"}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.donations[0]?.amount ? `Tk. ${item.donations[0].amount}` : "No amount"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5 text-primary" />
              <h2 className="text-xl text-primary">Donor Information</h2>
            </div>
            <DonorForm
              form={form}
              onGeneratePDF={handleGeneratePDF}
              onSaveDraft={handleSaveDraft}
              onPrint={handlePrint}
            />
          </div>

          <div className="lg:sticky lg:top-6 h-fit">
            <LetterPreview data={formData} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
