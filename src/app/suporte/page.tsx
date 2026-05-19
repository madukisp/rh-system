import { AppLayout } from "@/components/layout/app-layout";
import { HelpCircle, Mail } from "lucide-react";

export default function SuportePage() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Suporte
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Entre em contato com a equipe de suporte.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Mail, title: "Email", desc: "dados.rh@sbcdsaude.org.br"},
//          { icon: Phone, title: "Telefone", desc: "(11) 3000-0000", sub: "Seg-Sex, 8h–18h" },
//          { icon: MessageSquare, title: "Chat Online", desc: "Chat ao vivo", sub: "Disponível agora" },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-500" />
          Enviar uma solicitação
        </h3>
        <div className="space-y-3">
          <input
            placeholder="Assunto"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Descreva seu problema ou dúvida..."
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            Enviar Solicitação
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
