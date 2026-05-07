import { Mail, Phone, MapPin, Building2, Smartphone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>info@sombhabona.org</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>01737243447</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Address</p>
              <p>756 West Sewrapara, Mirpur, Dhaka</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Bank Account</p>
              <p>Sonali Bank - A/C: 4443801010947</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-3 text-xs">
            <div className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Mobile Banking:</span>
            </div>
            <span>Bkash: 01883742038</span>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <span>Nagad: 01883742038</span>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <span>Rocket: 018837420387</span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            © 2026 Sombhabona NGO. All rights reserved. | Routing Number: 200263047
          </p>
        </div>
      </div>
    </footer>
  );
}
