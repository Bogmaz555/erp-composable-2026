"use client";

import React, { useState, useEffect } from 'react';
import { Settings2, Zap, Box, Trash2, CheckCircle2, Lightbulb, History, ChevronDown, ChevronRight, PlusCircle, AlertCircle, Calendar, ShieldCheck, Briefcase } from 'lucide-react';

interface CatalogItem {
    id: string;
    sku: string;
    name: string;
    category: string;
    type: 'HARDWARE' | 'SERVICE' | 'SOFTWARE';
    basePrice: number;
    currency: string;
}

interface Milestone {
    id: string;
    phase: string;
    percentage: number;
    days: number;
    status?: string;
    ksefRef?: string;
}

export default function CpqConfigurator() {
    // Stan integracji z CRM
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [selectedOppId, setSelectedOppId] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Stan modułów i katalogu
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [modules, setModules] = useState<{ id: number, sku: string, name: string, price: number, qty: number, currency: string, catalogItemId: string, type: string }[]>([]);

    // Inteligentne podpowiedzi
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Twarde warunki handlowe i kalkulacja
    const [marginCoefficient, setMarginCoefficient] = useState<number>(0.8);
    const [leadTimeWeeks, setLeadTimeWeeks] = useState<number>(24);
    const [offerValidityDays, setOfferValidityDays] = useState<number>(14);
    const [warrantyTerms, setWarrantyTerms] = useState<string>("12 miesięcy");
    const [notes, setNotes] = useState<string>("");

    const [paymentMilestones, setPaymentMilestones] = useState<Milestone[]>([
        { id: 'm1', phase: 'Przedpłata po podpisaniu umowy', percentage: 50, days: 7 },
        { id: 'm2', phase: 'Gotowość do wysyłki (FAT)', percentage: 40, days: 0 },
        { id: 'm3', phase: 'Po montażu i uruchomieniu (SAT)', percentage: 10, days: 14 }
    ]);

    // Accordion states
    const [activeAccordion, setActiveAccordion] = useState<string>('bom');

    const toggleAccordion = (id: string) => {
        setActiveAccordion(prev => prev === id ? '' : id);
    };

    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                const response = await fetch('/api/crm');
                if (response.ok) {
                    const data = await response.json();
                    const activeOpps = data.filter((opp: any) =>
                        ['NEW', 'QUOTED', 'NEGOTIATION'].includes(opp.status) || !['ACCEPTED', 'LOST'].includes(opp.status)
                    );
                    setOpportunities(activeOpps);
                }
            } catch (error) {
                console.error('Failed to fetch opportunities:', error);
            }
        };

        const fetchCatalog = async () => {
             try {
                const response = await fetch('/api/crm/catalog');
                if (response.ok) {
                    const data = await response.json();
                    setCatalogItems(data);
                }
             } catch (error) {
                console.error('Failed to fetch catalog:', error);
             }
        };

        fetchOpportunities();
        fetchCatalog();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetch(`/api/crm/suggestions?category=${encodeURIComponent(selectedCategory)}`)
               .then(res => res.json())
               .then(data => setSuggestions(data.suggestions || []))
               .catch(err => {
                   console.error(err);
                   setSuggestions([]);
               });
        } else {
            setSuggestions([]);
        }
    }, [selectedCategory]);

    const availableModules = catalogItems;
    const moduleCategories = Array.from(new Set(availableModules.map(m => m.category)));

    const addModule = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!e.target.value) return;
        const selected = availableModules.find(m => m.id === e.target.value);
        if (selected) {
            setModules([...modules, { 
                id: Date.now(), 
                sku: selected.sku, 
                name: selected.name, 
                price: selected.basePrice, 
                qty: 1, 
                currency: selected.currency, 
                catalogItemId: selected.id,
                type: selected.type || 'HARDWARE'
            }]);
        }
        e.target.value = "";
    };

    const cloneSuggestion = (sug: any) => {
        setModules(prev => [...prev, {
            id: Date.now() + Math.random(),
            sku: sug.catalogItem.sku,
            name: `${sug.catalogItem.name} (Zalecane)`,
            price: sug.unitPrice ? sug.unitPrice : sug.suggestedPrice / (sug.quantity || 1), // use unitPrice for calculation
            qty: sug.quantity || 1,
            currency: sug.catalogItem.currency,
            catalogItemId: sug.catalogItem.id,
            type: sug.catalogItem.type || 'HARDWARE'
        }]);
    };

    const cloneMultipleSuggestions = (suggestionsToClone: any[]) => {
        const newModules = suggestionsToClone.map(sug => ({
            id: Date.now() + Math.random(),
            sku: sug.catalogItem.sku,
            name: `${sug.catalogItem.name} (Zalecane)`,
            price: sug.unitPrice ? sug.unitPrice : sug.suggestedPrice / (sug.quantity || 1),
            qty: sug.quantity || 1,
            currency: sug.catalogItem.currency,
            catalogItemId: sug.catalogItem.id,
            type: sug.catalogItem.type || 'HARDWARE'
        }));
        setModules(prev => [...prev, ...newModules]);
    };

    const removeModule = (id: number) => setModules(modules.filter(m => m.id !== id));
    const updateQty = (id: number, qty: number) => {
        if (qty < 1) return;
        setModules(modules.map(m => m.id === id ? { ...m, qty } : m));
    };

    // Obsługa milestonów
    const addMilestone = () => {
        setPaymentMilestones([...paymentMilestones, { id: `m${Date.now()}`, phase: 'Nowa transza', percentage: 0, days: 0 }]);
    };
    const removeMilestone = (id: string) => {
        setPaymentMilestones(paymentMilestones.filter(m => m.id !== id));
    };
    const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
        setPaymentMilestones(paymentMilestones.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const milestonesSum = paymentMilestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
    const milestonesValid = milestonesSum === 100;

    // Obliczenia cenowe
    const modulesCost = modules.reduce((acc, m) => acc + (m.price * m.qty), 0);
    const validCoeff = marginCoefficient > 0 ? marginCoefficient : 0.8;
    const finalPrice = modulesCost / validCoeff; 
    const baseCurrency = modules.length > 0 ? modules[0].currency : 'PLN';

    const formatPrice = (val: number, cur: string = 'PLN') => {
        return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(val);
    }

    const handleGenerateQuote = async () => {
        if (!selectedOppId || !milestonesValid) return;

        const selectedOpp = opportunities.find(o => o.id === selectedOppId);

        try {
            // Zapis do Opportunity (CRM)
            const response = await fetch('/api/crm', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedOppId,
                    value: finalPrice,
                    status: 'OFFER_SENT',
                    leadTimeWeeks,
                    offerValidityDays,
                    warrantyTerms,
                    paymentMilestones,
                    marginCoefficient
                })
            });

            if (response.ok) {
                // Generowanie wirtualnego dokumentu PDF
                await fetch('/api/crm/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        opportunityId: selectedOppId,
                        fileName: `Oferta_Systemowa_${Date.now()}.pdf`,
                        fileType: 'PDF',
                        fileUrl: ''
                    })
                });

                // Automatyzacja Follow-up Task
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (offerValidityDays - 2));

                await fetch('/api/crm/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        opportunityId: selectedOppId,
                        title: `Follow-up oferty: ${selectedOpp?.title || 'Brak tytułu'}`,
                        type: 'CALL',
                        dueDate: dueDate.toISOString(),
                        priority: 'HIGH'
                    })
                });

                setSuccessMessage('Wycena zsynchronizowana. Utworzono zadanie Follow-up na 2 dni przed końcem oferty.');
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch (error) {
            console.error('Failed to update opportunity/generate quote:', error);
        }
    };

    const AccordionHeader = ({ id, icon: Icon, title, isError = false }: { id: string, icon: any, title: string, isError?: boolean }) => (
        <button 
            onClick={() => toggleAccordion(id)}
            className={`w-full flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 transition-colors ${activeAccordion === id ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isError ? 'text-red-400' : 'text-indigo-400'}`} />
                <span className={`font-semibold uppercase tracking-wider text-sm ${isError ? 'text-red-400' : 'text-slate-200'}`}>{title}</span>
            </div>
            {activeAccordion === id ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
        </button>
    );

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex-1 overflow-y-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings2 className="w-6 h-6 text-indigo-400" />
                        Zaawansowany Konfigurator ETO
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Kalkulacja sprzętu, usług i warunków handlowych</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded border border-indigo-500/30">
                    Tryb Inżynieryjny 2.0
                </span>
            </div>

            {successMessage && (
                <div className="mb-6 p-4 rounded-lg bg-green-950/40 border border-green-500/30 flex items-center gap-3 shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <p className="text-green-400 text-sm font-semibold">{successMessage}</p>
                </div>
            )}

            {/* WYBÓR LEADA */}
            <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Przypisz wycenę do Szansy Sprzedaży
                </label>
                <select
                    value={selectedOppId}
                    onChange={(e) => {
                        const id = e.target.value;
                        setSelectedOppId(id);
                        const opp = opportunities.find((o: { id: string }) => o.id === id);
                        if (opp?.paymentMilestones && Array.isArray(opp.paymentMilestones)) {
                            setPaymentMilestones(opp.paymentMilestones as Milestone[]);
                        }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                    <option value="" disabled>-- Wybierz projekt z Pipeline --</option>
                    {opportunities.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                            {opp.title} - Klient: {opp.customer?.name} ({opp.status})
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEWA KOLUMNA: Wyszukiwarki */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner">
                        <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center gap-2">
                            <Box className="w-4 h-4 text-slate-500" /> Wybór Asortymentu
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-2">Dodaj Sprzęt / Moduły</label>
                                <select
                                    onChange={addModule}
                                    defaultValue=""
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="" disabled>+ Wybierz Sprzęt (HARDWARE)</option>
                                    {moduleCategories.map(cat => (
                                        <optgroup key={`hw-${cat}`} label={cat}>
                                            {availableModules.filter(m => m.category === cat && m.type === 'HARDWARE').map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({formatPrice(m.basePrice, m.currency)})</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-2">Dodaj Usługi Inżynieryjne i Montaż</label>
                                <select
                                    onChange={addModule}
                                    defaultValue=""
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="" disabled>+ Wybierz Usługę (SERVICE/SOFTWARE)</option>
                                    {moduleCategories.map(cat => (
                                        <optgroup key={`srv-${cat}`} label={cat}>
                                            {availableModules.filter(m => m.category === cat && ['SERVICE', 'SOFTWARE'].includes(m.type)).map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({formatPrice(m.basePrice, m.currency)}) [{m.type}]</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* INTELIGENTNE PODPOWIEDZI */}
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)]">
                        <h3 className="text-sm uppercase tracking-wider text-indigo-400 font-bold mb-4 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-indigo-500" /> Inteligentne Podpowiedzi
                        </h3>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 mb-4"
                        >
                            <option value="">-- Wybierz kategorię do analizy --</option>
                            {moduleCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        
                        {selectedCategory ? (
                            suggestions.length > 0 ? (
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.values(
                                        suggestions.reduce((acc: any, sug: any) => {
                                            if (!acc[sug.opportunityId]) {
                                                acc[sug.opportunityId] = {
                                                    opportunityId: sug.opportunityId,
                                                    projectName: sug.projectName,
                                                    customerName: sug.customerName,
                                                    date: sug.date,
                                                    laborIntensityRatio: sug.laborIntensityRatio,
                                                    hardware: [],
                                                    services: []
                                                };
                                            }
                                            if (sug.type === 'HARDWARE') {
                                                acc[sug.opportunityId].hardware.push(sug);
                                            } else {
                                                acc[sug.opportunityId].services.push(sug);
                                            }
                                            return acc;
                                        }, {})
                                    ).map((proj: any) => (
                                        <div key={proj.opportunityId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-800/60 p-3 border-b border-slate-700/50">
                                                <h4 className="text-slate-200 font-bold text-xs uppercase">{proj.projectName}</h4>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Klient: {proj.customerName} | Data: {new Date(proj.date).toLocaleDateString()}
                                                </p>
                                            </div>

                                            {/* Sekcja HARDWARE */}
                                            {proj.hardware.length > 0 && (
                                                <div className="p-3 border-b border-slate-800">
                                                    <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Sugerowany Sprzęt</h5>
                                                    <div className="space-y-2">
                                                        {proj.hardware.map((sug: any) => (
                                                            <div key={sug.id} className="bg-slate-950 p-2 rounded border border-slate-800/80 hover:border-slate-700 transition-colors group flex justify-between items-center">
                                                                <div>
                                                                    <div className="text-[11px] font-bold text-slate-300">{sug.catalogItem.name}</div>
                                                                    <div className="text-[9px] text-emerald-400 mt-0.5">Zwaloryzowana: {formatPrice(sug.suggestedPrice, sug.catalogItem.currency)}</div>
                                                                </div>
                                                                <button onClick={() => cloneSuggestion(sug)} className="opacity-0 group-hover:opacity-100 shrink-0 text-[10px] font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-all">
                                                                    Dodaj
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sekcja USŁUGI */}
                                            {proj.services.length > 0 && (
                                                <div className="p-3 bg-indigo-950/10 relative">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="group cursor-help relative">
                                                            <h5 className="text-[10px] uppercase font-bold text-indigo-400 border-b border-dashed border-indigo-400/50 inline-block">
                                                                Sugerowany Zakres Prac
                                                            </h5>
                                                            <span className="ml-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">
                                                                LIR: {proj.laborIntensityRatio}%
                                                            </span>
                                                            <div className="pointer-events-none absolute left-0 bottom-full mb-1 w-48 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-slate-300 text-[10px] p-2 rounded shadow-xl z-10 border border-slate-700">
                                                                Labor Intensity Ratio: (Wartość Usług w starym projekcie / Wartość całkowita starego projektu) * 100%
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => cloneMultipleSuggestions(proj.services)}
                                                            className="text-[10px] font-bold px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-md transition-colors flex items-center gap-1"
                                                        >
                                                            <PlusCircle className="w-3 h-3" /> Klonuj Zakres Prac
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        {proj.services.map((sug: any) => (
                                                            <div key={sug.id} className="bg-slate-900 border border-indigo-500/20 p-2 rounded flex justify-between items-center group">
                                                                <div className="flex flex-col">
                                                                    <div className="text-[11px] font-bold text-slate-200">
                                                                        {sug.catalogItem.name} 
                                                                        <span className="ml-2 text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1 rounded">{sug.quantity}h</span>
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-500 mt-1 flex gap-2">
                                                                        <span>Aktualna stawka: <span className="text-slate-300">{formatPrice(sug.unitPrice, sug.catalogItem.currency)}/h</span></span>
                                                                        <span>= <span className="text-emerald-400">{formatPrice(sug.suggestedPrice, sug.catalogItem.currency)}</span></span>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => cloneSuggestion(sug)} className="opacity-0 group-hover:opacity-100 shrink-0 text-[10px] font-bold px-2 py-1 bg-indigo-600/20 text-indigo-300 rounded hover:bg-indigo-600/40 transition-all">
                                                                    Dodaj Pojedynczo
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic text-center">Budowanie bazy doświadczeń...</p>
                            )
                        ) : (
                            <p className="text-xs text-slate-500 italic text-center">Wybierz kategorię ze słownika wyżej.</p>
                        )}
                    </div>
                </div>

                {/* PRAWA KOLUMNA: Szczeble Konfiguracji (Accordions) */}
                <div className="lg:col-span-8 flex flex-col space-y-4">
                    
                    {/* SEKCJA 1: BOM */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                        <AccordionHeader id="bom" icon={Box} title={`BOM: Lista Sprzętu i Usług (${modules.length})`} />
                        {activeAccordion === 'bom' && (
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-900 border-b border-slate-800">
                                        <tr>
                                            <th className="p-3 font-semibold uppercase tracking-wider text-xs">Typ</th>
                                            <th className="p-3 font-semibold uppercase tracking-wider text-xs">Komponent</th>
                                            <th className="p-3 font-semibold w-24 text-center uppercase tracking-wider text-xs">Ilość</th>
                                            <th className="p-3 font-semibold text-right uppercase tracking-wider text-xs">Cena Netto</th>
                                            <th className="p-3 font-semibold text-right uppercase tracking-wider text-xs">Razem</th>
                                            <th className="p-3 font-semibold text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {modules.map(part => (
                                            <tr key={part.id} className="hover:bg-slate-900/50 transition-colors">
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${part.type === 'SERVICE' ? 'bg-amber-500/10 text-amber-500' : part.type === 'SOFTWARE' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                                                        {part.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-200">{part.name}</td>
                                                <td className="p-3 text-center">
                                                    <input type="number" value={part.qty} onChange={(e) => updateQty(part.id, parseInt(e.target.value) || 1)} className="w-14 bg-slate-900 border border-slate-700 text-center rounded p-1 text-white text-xs focus:outline-none focus:border-indigo-500" min="1" />
                                                </td>
                                                <td className="p-3 text-right tabular-nums text-slate-400 text-xs">{formatPrice(part.price, part.currency)}</td>
                                                <td className="p-3 text-right tabular-nums text-slate-200 font-semibold">{formatPrice(part.price * part.qty, part.currency)}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => removeModule(part.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center">
                                    <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Wartość BOM (Łącznie Netto):</span>
                                    <span className="text-lg font-bold text-slate-200 tabular-nums">{formatPrice(modulesCost, baseCurrency)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SEKCJA 2: Podsumowanie i Narzut */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                        <AccordionHeader id="pricing" icon={Briefcase} title="Podsumowanie i Marża (Współczynnik)" />
                        {activeAccordion === 'pricing' && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900/30">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Total Netto (Sztywne koszty)</label>
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-300 font-mono text-sm tabular-nums">
                                            {formatPrice(modulesCost, baseCurrency)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 flex justify-between">
                                            <span>Współczynnik Narzutu</span>
                                            <span className="text-emerald-400">{marginCoefficient}</span>
                                        </label>
                                        <input
                                            type="number" step="0.05" min="0.1" max="2.0"
                                            value={marginCoefficient}
                                            onChange={(e) => setMarginCoefficient(parseFloat(e.target.value) || 1)}
                                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 font-bold placeholder-slate-600"
                                            placeholder="np. 0.8"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-2">Finalna Cena = Total Netto / Współczynnik. Wartość mniejsza niż 1 zwiększa cenę (np. 0.8 oznacza sprzedaż z marżą narzutu).</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end justify-center p-6 bg-indigo-900/10 rounded-xl border border-indigo-500/20">
                                    <span className="text-xs text-indigo-400 uppercase tracking-widest font-bold mb-2">Cena do Oferty</span>
                                    <span className="text-3xl font-extrabold text-white tabular-nums drop-shadow-md">
                                        {formatPrice(finalPrice, baseCurrency)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SEKCJA 3: Warunki Handlowe */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                        <AccordionHeader id="commercial" icon={ShieldCheck} title="Warunki Handlowe" />
                        {activeAccordion === 'commercial' && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/30">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Termin Wykonania (Tygodnie)</label>
                                    <input type="number" value={leadTimeWeeks} onChange={(e) => setLeadTimeWeeks(parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Ważność Oferty (Dni)</label>
                                    <input type="number" value={offerValidityDays} onChange={(e) => setOfferValidityDays(parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Warunki Gwarancji</label>
                                    <input type="text" value={warrantyTerms} onChange={(e) => setWarrantyTerms(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder="np. 12 miesięcy od SAT" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Uwagi dodatkowe (Opcjonalnie)</label>
                                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder="Zawrotki, warunki dostawy EXW" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SEKCJA 4: Warunki Płatności */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                        <AccordionHeader id="milestones" icon={Calendar} title="Haromonogram Płatności (Transze)" isError={!milestonesValid} />
                        {activeAccordion === 'milestones' && (
                            <div className="p-6 bg-slate-900/30">
                                {!milestonesValid && (
                                    <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                                        <AlertCircle className="w-4 h-4" /> Błąd sumowania: Transze sumują się do {milestonesSum}%. Wymagane równo 100%.
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {paymentMilestones.map((ms, index) => (
                                        <div key={ms.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-slate-900 p-3 border border-slate-800 rounded-lg">
                                            <div className="w-8 flex justify-center text-slate-600 font-bold text-xs">{index + 1}.</div>
                                            {ms.status && (
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                    ms.status === 'RECOGNIZED' ? 'text-violet-400 border-violet-700/50 bg-violet-950/40' :
                                                    ms.status === 'INVOICED' ? 'text-emerald-400 border-emerald-700/50 bg-emerald-950/40' :
                                                    ms.status === 'READY' ? 'text-cyan-400 border-cyan-700/50 bg-cyan-950/40' :
                                                    'text-amber-400 border-amber-700/50'
                                                }`}>{ms.status}</span>
                                            )}
                                            <input type="text" value={ms.phase} onChange={(e) => updateMilestone(ms.id, 'phase', e.target.value)} className="flex-1 min-w-[200px] bg-transparent border-b border-slate-700 pb-1 text-slate-200 text-sm focus:border-indigo-500 focus:outline-none" placeholder="Nazwa Fazy / Transzy" />
                                            <div className="flex items-center gap-2">
                                                <input type="number" value={ms.percentage} onChange={(e) => updateMilestone(ms.id, 'percentage', parseInt(e.target.value) || 0)} className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-center text-indigo-400 font-bold focus:border-indigo-500 focus:outline-none" />
                                                <span className="text-slate-500 text-xs font-bold">%</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase text-slate-600 font-bold ml-2">Termin (Dni):</span>
                                                <input type="number" value={ms.days} onChange={(e) => updateMilestone(ms.id, 'days', parseInt(e.target.value) || 0)} className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-center text-slate-300 focus:border-indigo-500 focus:outline-none" />
                                            </div>
                                            <button onClick={() => removeMilestone(ms.id)} className="ml-2 text-slate-600 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addMilestone} className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors">
                                    <PlusCircle className="w-4 h-4" /> Dodaj Transzę
                                </button>
                            </div>
                        )}
                    </div>

                    {/* AKCJA */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleGenerateQuote}
                            disabled={!selectedOppId || !milestonesValid}
                            className="group relative px-8 py-4 font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all uppercase tracking-wider text-sm overflow-hidden shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                            <span className="relative flex items-center gap-2">
                                <Zap className="w-5 h-5 text-indigo-200" />
                                Zapisz, Wyślij i Ustaw Follow-up (Narzędzie)
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}