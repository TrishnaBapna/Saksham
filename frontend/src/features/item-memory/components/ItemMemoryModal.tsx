/**
 * SAKSHAM NEURO-CARE — ITEM LOCATION MEMORY MODAL
 * Accessible visual item recall interface for patients and caregivers.
 */

import React, { useState } from 'react';
import { ItemLocationRecord } from '../types/itemMemory.types.js';
import { ItemLocationService } from '../services/itemLocationService.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import {
  getItemMemoryUi,
  getTranslatedItemRecord,
  getTranslatedRoomName,
} from '../utils/itemMemoryTranslation.js';
import {
  X,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Glasses,
  Key,
  Tv,
  Pill,
} from 'lucide-react';

interface ItemMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  initialSelectedItemId?: string;
}

export const ItemMemoryModal: React.FC<ItemMemoryModalProps> = ({
  isOpen,
  onClose,
  patientId = 'sunita_01',
  patientName = 'Sunita Ji',
  initialSelectedItemId,
}) => {
  const { t, language } = useLanguage();
  const itemUi = getItemMemoryUi(language);
  const [items, setItems] = useState<ItemLocationRecord[]>(() =>
    ItemLocationService.getItems(patientId)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemLocationRecord | null>(() => {
    if (initialSelectedItemId) {
      const all = ItemLocationService.getItems(patientId);
      return all.find((i) => i.id === initialSelectedItemId) || null;
    }
    return null;
  });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newRoom, setNewRoom] = useState('Living Room');
  const [newNotes, setNewNotes] = useState('');
  const [newPhoto, setNewPhoto] = useState('');

  if (!isOpen) return null;

  const handleRefresh = () => {
    setItems(ItemLocationService.getItems(patientId));
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newLocation.trim()) return;

    const record: ItemLocationRecord = {
      id: `item-${Date.now()}`,
      patientId,
      itemName: newName.trim(),
      synonyms: [newName.trim().toLowerCase()],
      locationRecorded: newLocation.trim(),
      room: newRoom,
      photoDataUrl:
        newPhoto ||
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
      recordedAt: 'Just now',
      verifiedStatus: 'LAST_RECORDED',
      notes: newNotes.trim() || undefined,
    };

    await ItemLocationService.saveItem(record);
    handleRefresh();
    setIsAddingNew(false);
    setNewName('');
    setNewLocation('');
    setNewNotes('');
    setNewPhoto('');
    setSelectedItem(record);
  };

  const handleDeleteItem = async (itemId: string) => {
    await ItemLocationService.deleteItem(patientId, itemId);
    handleRefresh();
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const loc = getTranslatedItemRecord(item, language);
    return (
      item.itemName.toLowerCase().includes(q) ||
      item.locationRecorded.toLowerCase().includes(q) ||
      (item.room && item.room.toLowerCase().includes(q)) ||
      loc.itemName.toLowerCase().includes(q) ||
      loc.locationRecorded.toLowerCase().includes(q) ||
      loc.room.toLowerCase().includes(q) ||
      item.synonyms.some((s) => s.toLowerCase().includes(q))
    );
  });

  const translatedSelected = selectedItem ? getTranslatedItemRecord(selectedItem, language) : null;

  const getItemIcon = (item: ItemLocationRecord) => {
    if (item.id === 'item-01') return Glasses;
    if (item.id === 'item-02') return Key;
    if (item.id === 'item-04') return Pill;
    if (item.id === 'item-05') return Tv;
    const n = item.itemName.toLowerCase();
    if (n.includes('glass') || n.includes('chashm')) return Glasses;
    if (n.includes('key') || n.includes('chabi')) return Key;
    if (n.includes('remote')) return Tv;
    if (n.includes('medicine') || n.includes('pill') || n.includes('dawa')) return Pill;
    return MapPin;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-memory-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="item-memory-title" className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {t('item_memory.title')}
                <span className="text-xs px-2 py-0.5 font-medium bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  {itemUi.groundingVerified}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {itemUi.subtitleTemplate.replace('{name}', patientName)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={itemUi.closeAria}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Detailed Item View */}
          {selectedItem && translatedSelected ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedItem(null)}
                className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> {itemUi.backToList}
              </button>

              <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {translatedSelected.room || itemUi.personalItem}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{translatedSelected.itemName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {itemUi.lastRecordedPrefix} {translatedSelected.recordedAt}
                    </span>
                  </div>
                </div>

                {/* Photo Display */}
                {selectedItem.photoDataUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-72 bg-slate-100">
                    <img
                      src={selectedItem.photoDataUrl}
                      alt={translatedSelected.itemName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {itemUi.visualGrounding}
                    </div>
                  </div>
                )}

                {/* Location Grounding Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <MapPin className="w-4 h-4" />
                    {itemUi.lastRecordedLocationLabel}
                  </div>
                  <p className="text-lg font-semibold text-slate-800 pl-6">
                    {translatedSelected.locationRecorded}
                  </p>
                  {translatedSelected.notes && (
                    <p className="text-sm text-slate-600 pl-6 italic">
                      {itemUi.notesPrefix} {translatedSelected.notes}
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-500">
                    {itemUi.ashaUsesTemplate.replace('{item}', translatedSelected.itemName)}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> {itemUi.deleteRecord}
                  </button>
                </div>
              </div>
            </div>
          ) : isAddingNew ? (
            /* Add New Item Form */
            <form onSubmit={handleSaveNewItem} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" /> {itemUi.cancel}
                </button>
                <h3 className="font-bold text-slate-800">{itemUi.recordItemLocation}</h3>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {itemUi.itemNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={itemUi.itemNamePlaceholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {itemUi.roomAreaLabel}
                    </label>
                    <select
                      value={newRoom}
                      onChange={(e) => setNewRoom(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Bedroom">{getTranslatedRoomName('Bedroom', language)}</option>
                      <option value="Living Room">{getTranslatedRoomName('Living Room', language)}</option>
                      <option value="Dining Room">{getTranslatedRoomName('Dining Room', language)}</option>
                      <option value="Entrance Hall">{getTranslatedRoomName('Entrance Hall', language)}</option>
                      <option value="Kitchen">{getTranslatedRoomName('Kitchen', language)}</option>
                      <option value="Verandah">{getTranslatedRoomName('Verandah', language)}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {itemUi.specificLocationLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder={itemUi.specificLocationPlaceholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {itemUi.photoUrlLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newPhoto}
                      onChange={(e) => setNewPhoto(e.target.value)}
                      placeholder={itemUi.photoUrlPlaceholder}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {itemUi.notesLabel}
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={itemUi.notesPlaceholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {itemUi.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {itemUi.saveLocationBtn}
                </button>
              </div>
            </form>
          ) : (
            /* Item List View */
            <div className="space-y-3">
              {/* Controls: Search and Add Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={itemUi.searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                  />
                </div>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> {itemUi.recordNewBtn}
                </button>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {filteredItems.map((item) => {
                  const Icon = getItemIcon(item);
                  const locItem = getTranslatedItemRecord(item, language);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 transition-all text-left flex items-start gap-3 shadow-xs hover:shadow-md group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 overflow-hidden border border-emerald-200">
                        {item.photoDataUrl ? (
                          <img
                            src={item.photoDataUrl}
                            alt={locItem.itemName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-base truncate group-hover:text-emerald-900">
                            {locItem.itemName}
                          </h4>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {locItem.room || itemUi.personalItem}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          📍 {locItem.locationRecorded}
                        </p>
                        <span className="text-[11px] text-slate-400 block mt-1">
                          {itemUi.recordedAtPrefix} {locItem.recordedAt}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">{itemUi.noMatchingItems}</p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {itemUi.clearSearch}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            {itemUi.footerSummaryTemplate.replace('{count}', String(items.length))}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
