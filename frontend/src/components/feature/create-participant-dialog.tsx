import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { formatRAMQ } from "@/lib/validation";
import {
  participantSchema,
  type ParticipantFormValues,
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
import type { Participant } from "@/types/participant";

type EditSection = "participant" | "contacts";

interface ParticipantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When provided, the dialog opens in edit mode */
  participant?: Participant | null;
  /** Which section to edit — only used in edit mode */
  editSection?: EditSection;
}

const DEFAULT_VALUES: ParticipantFormValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  sex_at_birth_code: "",
  ramq: "",
  vital_status_code: "alive",
  date_of_death: "",
  email: "",
  phone: "",
  street_address: "",
  city: "",
  province: "QC",
  code_postal: "",
  contacts: [],
};

const SEX_OPTIONS = ["male", "female", "unknown"] as const;
const VITAL_STATUS_OPTIONS = ["alive", "deceased", "unknown"] as const;
const RELATIONSHIP_OPTIONS = ["mother", "father", "guardian", "other"] as const;
const LANGUAGE_OPTIONS = ["fr", "en"] as const;

function participantToFormValues(p: Participant): ParticipantFormValues {
  const selfContact = p.contacts?.find((c) => c.relationship_code === "self");
  return {
    first_name: p.first_name,
    last_name: p.last_name,
    date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : "",
    sex_at_birth_code: p.sex_at_birth_code,
    ramq: p.ramq ?? "",
    vital_status_code: p.vital_status_code,
    date_of_death: p.date_of_death ? p.date_of_death.slice(0, 10) : "",
    email: selfContact?.email ?? "",
    phone: selfContact?.phone ?? "",
    street_address: selfContact?.street_address ?? "",
    city: selfContact?.city ?? "",
    province: selfContact?.province ?? "QC",
    code_postal: selfContact?.code_postal ?? "",
    contacts:
      p.contacts
        ?.filter((c) => c.relationship_code !== "self")
        .map((c) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          relationship_code: c.relationship_code,
          preferred_language: c.preferred_language,
          same_coordinates: false,
          is_primary: c.is_primary,
          email: c.email,
          phone: c.phone,
          street_address: c.street_address,
          city: c.city,
          province: c.province,
          code_postal: c.code_postal,
        })) ?? [],
  };
}

export function ParticipantFormDialog({
  open,
  onOpenChange,
  onSuccess,
  participant,
  editSection = "participant",
}: ParticipantFormDialogProps) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!participant;
  const showParticipantFields = !isEdit || editSection === "participant";
  const showContactFields = !isEdit || editSection === "contacts";

  const schema = participantSchema(t);

  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Reset form when participant changes (edit mode) or when switching modes
  useEffect(() => {
    if (open) {
      if (participant) {
        form.reset(participantToFormValues(participant));
      } else {
        form.reset(DEFAULT_VALUES);
      }
    }
  }, [open, participant, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      form.reset(DEFAULT_VALUES);
      setSubmitError(null);
    }
    onOpenChange(value);
  };

  const onSubmit = async (data: ParticipantFormValues) => {
    setSubmitError(null);
    try {
      if (isEdit) {
        await api.put(`/participants/${participant.id}`, data);
      } else {
        await api.post("/participants", data);
      }
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setSubmitError(
        t(isEdit ? "edit_participant.error" : "create_participant.error"),
      );
    }
  };

  const setPrimaryContact = (index: number) => {
    const contacts = form.getValues("contacts");
    contacts.forEach((_, i) => {
      form.setValue(`contacts.${i}.is_primary`, i === index);
    });
  };

  const addContact = () => {
    append({
      first_name: "",
      last_name: "",
      relationship_code: "",
      preferred_language: "fr",
      same_coordinates: true,
      is_primary: fields.length === 0,
      email: "",
      phone: "",
      street_address: "",
      city: "",
      province: "QC",
      code_postal: "",
    });
  };

  const removeContact = (index: number) => {
    remove(index);
    const contacts = form.getValues("contacts");
    if (contacts.length > 0 && !contacts.some((c) => c.is_primary)) {
      form.setValue("contacts.0.is_primary", true);
    }
  };

  const vitalStatus = form.watch("vital_status_code");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? editSection === "contacts"
                  ? "edit_contacts.title"
                  : "edit_participant.title"
                : "create_participant.title",
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            autoComplete="off"
            className="space-y-6"
          >
            {showParticipantFields && (<>
            {/* Section 1: Participant */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground">
                {t("create_participant.section_participant")}
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  schema={schema}
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.first_name")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  schema={schema}
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.last_name")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  schema={schema}
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.date_of_birth")}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  schema={schema}
                  control={form.control}
                  name="sex_at_birth_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.sex_at_birth")}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEX_OPTIONS.map((code) => (
                            <SelectItem key={code} value={code}>
                              {t(`enums.sex_at_birth.${code}`)}
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
                  schema={schema}
                  control={form.control}
                  name="ramq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.ramq")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(formatRAMQ(e.target.value))
                          }
                          placeholder="TREG 8501 0112"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  schema={schema}
                  control={form.control}
                  name="vital_status_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.vital_status")}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VITAL_STATUS_OPTIONS.map((code) => (
                            <SelectItem key={code} value={code}>
                              {t(`enums.vital_status.${code}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              {vitalStatus === "deceased" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    schema={schema}
                    control={form.control}
                    name="date_of_death"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("create_participant.date_of_death")}
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div />
                </div>
              )}
            </fieldset>

            <hr className="border-border" />

            {/* Section 2: Coordonnées */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground">
                {t("create_participant.section_coordinates")}
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  schema={schema}
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.email")}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  schema={schema}
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.phone")}</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                schema={schema}
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("create_participant.street_address")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  schema={schema}
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.city")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  schema={schema}
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.province")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  schema={schema}
                  control={form.control}
                  name="code_postal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.code_postal")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div />
              </div>
            </fieldset>
            </>)}

            {showContactFields && (<>
            {/* Section 3: Contacts */}
            {showParticipantFields && <hr className="border-border" />}

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-foreground">
                    {t("create_participant.section_contacts")}
                  </legend>

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
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`c-${index}-is-primary`}
                              checked={form.watch(
                                `contacts.${index}.is_primary`,
                              )}
                              onCheckedChange={() => setPrimaryContact(index)}
                            />
                            <Label
                              htmlFor={`c-${index}-is-primary`}
                              className="font-normal"
                            >
                              {t("create_participant.is_primary")}
                            </Label>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            schema={null}
                            control={form.control}
                            name={`contacts.${index}.first_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("create_participant.first_name")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            schema={null}
                            control={form.control}
                            name={`contacts.${index}.last_name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {t("create_participant.last_name")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
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
                                <FormLabel>
                                  {t("create_participant.relationship")}
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {RELATIONSHIP_OPTIONS.map((code) => (
                                      <SelectItem key={code} value={code}>
                                        {t(`enums.relationship.${code}`)}
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
                                <FormLabel>
                                  {t("create_participant.preferred_language")}
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
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
                            id={`c-${index}-same-coordinates`}
                            checked={sameCoordinates}
                            onCheckedChange={(checked) =>
                              form.setValue(
                                `contacts.${index}.same_coordinates`,
                                checked === true,
                              )
                            }
                          />
                          <Label
                            htmlFor={`c-${index}-same-coordinates`}
                            className="font-normal"
                          >
                            {t("create_participant.same_coordinates")}
                          </Label>
                        </div>

                        {!sameCoordinates && (
                          <div className="space-y-3 rounded-md border border-dashed border-border p-3">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                schema={null}
                                control={form.control}
                                name={`contacts.${index}.email`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("create_participant.email")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input type="email" {...field} />
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
                                    <FormLabel>
                                      {t("create_participant.phone")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input type="tel" {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              schema={null}
                              control={form.control}
                              name={`contacts.${index}.street_address`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {t("create_participant.street_address")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                schema={null}
                                control={form.control}
                                name={`contacts.${index}.city`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {t("create_participant.city")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input {...field} />
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
                                    <FormLabel>
                                      {t("create_participant.province")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
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
                                    <FormLabel>
                                      {t("create_participant.code_postal")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <div />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                  >
                    <Plus className="mr-1 size-4" />
                    {t("create_participant.add_contact")}
                  </Button>
                </fieldset>
            </>)}

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

/** @deprecated Use ParticipantFormDialog instead */
export const CreateParticipantDialog = ParticipantFormDialog;
