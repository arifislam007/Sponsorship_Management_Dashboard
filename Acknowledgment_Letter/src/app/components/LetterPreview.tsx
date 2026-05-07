import { LetterData } from "../App";
import { format } from "date-fns";
import logo from "../../imports/logo.png";

interface LetterPreviewProps {
  data: LetterData;
}

export default function LetterPreview({ data }: LetterPreviewProps) {
  const todayDate = format(new Date(), "MMMM dd, yyyy");

  const totalAmount = data.donations.reduce((sum, donation) => {
    return sum + (parseFloat(donation.amount) || 0);
  }, 0);

  const hasValidData = data.donorName && data.donations.some(d => d.amount);

  return (
    <div className="bg-white rounded-lg shadow-md border border-border overflow-hidden">
      <div className="bg-primary/5 px-4 py-3 border-b border-border">
        <h2 className="text-lg text-primary">Letter Preview</h2>
        <p className="text-sm text-muted-foreground">Real-time preview of acknowledgment letter</p>
      </div>

      <div className="p-8 relative overflow-auto max-h-[calc(100vh-200px)]">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <img src={logo} alt="" className="w-96 h-auto" />
        </div>

        <div className="relative bg-white">
          <div className="text-center mb-8 pb-4 border-b-2 border-primary">
            <div className="flex items-center justify-center mb-3">
              <img src={logo} alt="Sombhabona Logo" className="h-16 w-auto" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              756 West Sewrapara, Mirpur, Dhaka | Phone: 01737243447 | Email: info@sombhabona.org
            </p>
          </div>

          <div className="mb-6 text-right text-sm">
            <p>Date: <strong>{todayDate}</strong></p>
          </div>

          <div className="mb-6">
            <p className="text-sm">To,</p>
            <p className="mt-1">
              <strong>{data.donorName || "[Donor Name]"}</strong>
            </p>
          </div>

          <div className="mb-6">
            <p className="text-center">
              <strong>Subject: Acknowledgment of Donation</strong>
            </p>
          </div>

          <div className="space-y-4 text-justify leading-relaxed">
            <p>Dear {data.donorName || "[Donor Name]"},</p>

            <p>
              On behalf of <strong>Sombhabona</strong> and all those whose lives you touch, we extend our heartfelt
              gratitude for your generous contribution. Your support plays a vital role in enabling us to continue
              our mission of building hope and nurturing lives in our community.
            </p>

            {hasValidData && (
              <>
                <p>
                  We acknowledge with sincere appreciation your donation(s) towards <strong>{data.donationType}</strong>
                  {data.projectName && ` for the project "${data.projectName}"`}.
                </p>

                <div className="my-6">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-accent">
                        <th className="border border-border px-4 py-2 text-left">Date</th>
                        <th className="border border-border px-4 py-2 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.donations.map((donation, index) => (
                        donation.amount && (
                          <tr key={index} className="hover:bg-accent/30">
                            <td className="border border-border px-4 py-2">
                              {donation.date ? format(new Date(donation.date), "MMMM dd, yyyy") : "—"}
                            </td>
                            <td className="border border-border px-4 py-2 text-right">
                              ₹{parseFloat(donation.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      ))}
                      {totalAmount > 0 && (
                        <tr className="bg-primary/10">
                          <td className="border border-border px-4 py-2">
                            <strong>Total Amount</strong>
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            <strong>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p>
              This letter serves as an official receipt for your donation. Please retain it for your records.
            </p>

            {data.message && (
              <div className="p-4 bg-accent/50 rounded-lg border-l-4 border-primary">
                <p className="text-sm italic">{data.message}</p>
              </div>
            )}

            <p>
              Your compassion and generosity make a profound difference in the lives of those we serve. Together,
              we are creating lasting positive change and building a brighter future for our community.
            </p>

            <p>
              Thank you once again for your unwavering support and trust in our mission.
            </p>

            <p className="mt-6">With warm regards and gratitude,</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-border">
            <div>
              <div className="h-16 mb-2"></div>
              <p className="border-t border-foreground/30 pt-2 inline-block">
                <strong>Authorized Signatory</strong>
              </p>
              <p className="text-sm text-muted-foreground">Director, Sombhabona</p>
            </div>
            <div>
              <div className="h-16 mb-2"></div>
              <p className="border-t border-foreground/30 pt-2 inline-block">
                <strong>Secretary</strong>
              </p>
              <p className="text-sm text-muted-foreground">Sombhabona NGO</p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Bank Details:</strong> Sonali Bank, Mirpur Industrial Area Branch, Dhaka
            </p>
            <p>
              Account Name: Sombhabona | Account No: 4443801010947 | Routing No: 200263047
            </p>
            <p>
              <strong>Mobile Banking:</strong> Bkash: 01883742038 | Nagad: 01883742038 | Rocket: 018837420387
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
