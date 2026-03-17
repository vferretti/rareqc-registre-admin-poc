import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import {
  contactSchema,
  type ContactFormValues,
} from "@/lib/validations/participant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/base/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/base/ui/form";
import { Button } from "@/components/base/ui/button";
import { Input } from "@/components/base/ui/input";
import { Label } from "@/components/base/ui/label";
import { Checkbox } from "@/components/base/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import type { Contact, Participant } from "@/types/participant";
import { useEnums } from "@/hooks/useEnums";
import { LANGUAGE_OPTIONS, PROVINCE_OPTIONS } from "@/lib/constants";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  participant: Participant;
  /** When provided, the dialog opens in edit mode for this contact */
  contact?: Contact | null;
}

const EMPTY_CONTACT: ContactFormValues = {
  first_name: "",
  last_name: "",
  relationship_code: "",
  preferred_language: "fr",
  same_coordinates: false,
  is_primary: false,
  email: "",
  phone: "",
  apartment_number: "",
  street_address: "",
  city: "",
  province: "QC",
  code_postal: "",
};

/** Converts an existing Contact to form values. */
function contactToFormValues(c: Contact): ContactFormValues {
  return {
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    relationship_code: c.relationship_code,
    preferred_language: c.preferred_language,
    same_coordinates: false,
    is_primary: c.is_primary,
    email: c.email,
    phone: c.phone,
    apartment_number: c.apartment_number,
    street_address: c.street_address,
    city: c.city,
    province: c.province,
    code_postal: c.code_postal,
  };
}

/** Returns the self contact's coordinates for "same coordinates" feature. */
function getParticipantCoordinates(participant: Participant) {
  const self = participant.contacts?.find((c) => c.relationship_code === "self");
  return {
    email: self?.email ?? "",
    phone: self?.phone ?? "",
    apartment_number: self?.apartment_number ?? "",
    street_address: self?.street_address ?? "",
    city: self?.city ?? "",
    province: self?.province ?? "QC",
    code_postal: self?.code_postal ?? "",
  };
}

/** Builds the contacts array for the API, merging existing + new/edited contacts. */
function buildContactsPayload(
  participant: Participant,
  newContacts: ContactFormValues[],
) {
  const hasPrimaryInNew = newContacts.some((c) => c.is_primary);
  const existing =
    participant.contacts
      ?.filter((c) => c.relationship_code !== "self")
      .map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        relationship_code: c.relationship_code,
        preferred_language: c.preferred_language,
        same_coordinates: false,
        is_primary: hasPrimaryInNew ? false : c.is_primary,
        email: c.email,
        phone: c.phone,
        apartment_number: c.apartment_number,
        street_address: c.street_address,
        city: c.city,
        province: c.province,
        code_postal: c.code_postal,
      })) ?? [];
  return [...existing, ...newContacts];
}

/** Builds the contacts array for edit mode: replaces the edited contact, keeps others. */
function buildEditContactPayload(
  participant: Participant,
  editedContact: ContactFormValues,
) {
  const existing =
    participant.contacts
      ?.filter((c) => c.relationship_code !== "self" && c.id !== editedContact.id)
      .map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        relationship_code: c.relationship_code,
        preferred_language: c.preferred_language,
        same_coordinates: false,
        is_primary: editedContact.is_primary ? false : c.is_primary,
        email: c.email,
        phone: c.phone,
        apartment_number: c.apartment_number,
        street_address: c.street_address,
        city: c.city,
        province: c.province,
        code_postal: c.code_postal,
      })) ?? [];
  return [...existing, editedContact];
}

// Schema for the multi-contact form wrapper
const contactsFormSchema = (t: Parameters<typeof contactSchema>[0]) =>
  z.object({ contacts: z.array(contactSchema(t)) });
type ContactsFormValues = z.infer<ReturnType<typeof contactsFormSchema>>;

export function ContactFormDialog({
  open,
  onOpenChange,
  onSuccess,
  participant,
  contact = null,
}: ContactFormDialogProps) {
  const { t, i18n } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { enums } = useEnums();
  const isEdit = !!contact;
  const lang = i18n.language === "fr" ? "name_fr" : "name_en";

  const schema = contactsFormSchema(t);

  const form = useForm<ContactsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contacts: [{ ...EMPTY_CONTACT }] },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        form.reset({ contacts: [contactToFormValues(contact)] });
      } else {
        form.reset({ contacts: [{ ...EMPTY_CONTACT }] });
      }
    }
  }, [open, contact, form]);

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      form.reset({ contacts: [{ ...EMPTY_CONTACT }] });
      setSubmitError(null);
    }
    onOpenChange(value);
  };

  /** Toggles the primary flag: only one contact can be primary at a time. */
  const togglePrimaryContact = (index: number) => {
    const contacts = form.getValues("contacts");
    const isAlreadyPrimary = contacts[index]?.is_primary;
    contacts.forEach((_, i) => {
      form.setValue(`contacts.${i}.is_primary`, !isAlreadyPrimary && i === index);
    });
  };

  const onSubmit = async (data: ContactsFormValues) => {
    setSubmitError(null);
    try {
      const selfContact = participant.contacts?.find(
        (c) => c.relationship_code === "self",
      );
      const contacts = isEdit
        ? buildEditContactPayload(participant, data.contacts[0])
        : buildContactsPayload(participant, data.contacts);

      await api.put(`/participants/${participant.id}`, {
        first_name: participant.first_name,
        last_name: participant.last_name,
        date_of_birth: participant.date_of_birth?.slice(0, 10) ?? "",
        sex_at_birth_code: participant.sex_at_birth_code,
        ramq: participant.ramq ?? "",
        vital_status_code: participant.vital_status_code,
        date_of_death: participant.date_of_death?.slice(0, 10) ?? "",
        email: selfContact?.email ?? "",
        phone: selfContact?.phone ?? "",
        apartment_number: selfContact?.apartment_number ?? "",
        street_address: selfContact?.street_address ?? "",
        city: selfContact?.city ?? "",
        province: selfContact?.province ?? "QC",
        code_postal: selfContact?.code_postal ?? "",
        preferred_language: selfContact?.preferred_language ?? "fr",
        contacts,
      });
      form.reset({ contacts: [{ ...EMPTY_CONTACT }] });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setSubmitError(t("create_participant.error"));
    }
  };

  const coords = getParticipantCoordinates(participant);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? "participant_detail.edit_contact_title"
                : "participant_detail.add_contacts_title",
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            autoComplete="off"
            className="space-y-4"
          >
            {fields.map((field, index) => {
              const sameCoordinates = form.watch(
                `contacts.${index}.same_coordinates`,
              );
              return (
                <div
                  key={field.id}
                  className="space-y-3 rounded-md border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {t("create_participant.contact_ordinal", { number: index + 1 })}
                    </p>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      schema={null}
                      control={form.control}
                      name={`contacts.${index}.first_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_participant.first_name")}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      schema={null}
                      control={form.control}
                      name={`contacts.${index}.last_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_participant.last_name")}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      schema={null}
                      control={form.control}
                      name={`contacts.${index}.relationship_code`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_participant.relationship")}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {enums?.relationship.filter((e) => e.code !== "self").map((e) => (
                                <SelectItem key={e.code} value={e.code}>
                                  {e[lang]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      schema={null}
                      control={form.control}
                      name={`contacts.${index}.preferred_language`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_participant.preferred_language")}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LANGUAGE_OPTIONS.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {t(`enums.language.${code}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`contact-${index}-is-primary`}
                      checked={form.watch(`contacts.${index}.is_primary`)}
                      onCheckedChange={() => togglePrimaryContact(index)}
                    />
                    <Label htmlFor={`contact-${index}-is-primary`} className="font-normal">
                      {t("create_participant.is_primary")}
                    </Label>
                  </div>

                  <hr className="border-border" />

                  <p className="text-sm font-semibold text-foreground">
                    {t("create_participant.section_coordinates")}
                  </p>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`contact-${index}-same-coordinates`}
                      checked={sameCoordinates}
                      onCheckedChange={(checked) => {
                        const isSame = checked === true;
                        form.setValue(`contacts.${index}.same_coordinates`, isSame);
                        if (isSame) {
                          form.setValue(`contacts.${index}.email`, coords.email);
                          form.setValue(`contacts.${index}.phone`, coords.phone);
                          form.setValue(`contacts.${index}.apartment_number`, coords.apartment_number);
                          form.setValue(`contacts.${index}.street_address`, coords.street_address);
                          form.setValue(`contacts.${index}.city`, coords.city);
                          form.setValue(`contacts.${index}.province`, coords.province);
                          form.setValue(`contacts.${index}.code_postal`, coords.code_postal);
                        }
                      }}
                    />
                    <Label htmlFor={`contact-${index}-same-coordinates`} className="font-normal">
                      {t("create_participant.same_coordinates")}
                    </Label>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.email")}</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} disabled={sameCoordinates} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.phone")}</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} disabled={sameCoordinates} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.street_address`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.street_address")}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={sameCoordinates} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.apartment_number`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.apartment_number")}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={sameCoordinates} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.city`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.city")}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={sameCoordinates} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.province`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.province")}</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} disabled={sameCoordinates}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROVINCE_OPTIONS.map((code) => (
                                  <SelectItem key={code} value={code}>
                                    {t(`enums.province.${code}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        schema={null}
                        control={form.control}
                        name={`contacts.${index}.code_postal`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("create_participant.code_postal")}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={sameCoordinates} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div />
                    </div>
                  </div>
                </div>
              );
            })}

            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...EMPTY_CONTACT })}
              >
                <Plus className="mr-1 size-4" />
                {t("create_participant.add_contact")}
              </Button>
            )}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t(
                  isEdit
                    ? "edit_participant.submit"
                    : "create_participant.submit",
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
