import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import type { Participant } from "@/types/participant";
import { useEnums } from "@/hooks/useEnums";
import { LANGUAGE_OPTIONS, PROVINCE_OPTIONS } from "@/lib/constants";

interface ParticipantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (participantId?: number) => void;
  /** When provided, the dialog opens in edit mode */
  participant?: Participant | null;
}

const DEFAULT_VALUES: ParticipantFormValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  sex_at_birth_code: "",
  city_of_birth: "",
  ramq: "",
  vital_status_code: "alive",
  date_of_death: "",
  email: "",
  phone: "",
  apartment_number: "",
  street_address: "",
  city: "",
  province: "QC",
  code_postal: "",
  preferred_language: "fr",
};

function participantToFormValues(p: Participant): ParticipantFormValues {
  const selfContact = p.contacts?.find((c) => c.relationship_code === "self");
  return {
    first_name: p.first_name,
    last_name: p.last_name,
    date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : "",
    sex_at_birth_code: p.sex_at_birth_code,
    city_of_birth: p.city_of_birth ?? "",
    ramq: p.ramq ?? "",
    vital_status_code: p.vital_status_code,
    date_of_death: p.date_of_death ? p.date_of_death.slice(0, 10) : "",
    email: selfContact?.email ?? "",
    phone: selfContact?.phone ?? "",
    apartment_number: selfContact?.apartment_number ?? "",
    street_address: selfContact?.street_address ?? "",
    city: selfContact?.city ?? "",
    province: selfContact?.province ?? "QC",
    code_postal: selfContact?.code_postal ?? "",
    preferred_language: selfContact?.preferred_language ?? "fr",
  };
}

export function ParticipantFormDialog({
  open,
  onOpenChange,
  onSuccess,
  participant,
}: ParticipantFormDialogProps) {
  const { t, i18n } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { enums } = useEnums();
  const isEdit = !!participant;
  const lang = i18n.language === "fr" ? "name_fr" : "name_en";

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
        const values = participantToFormValues(participant);
        form.reset(values);
      } else {
        form.reset(DEFAULT_VALUES);
      }
    }
  }, [open, participant, form]);

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
      let createdId: number | undefined;
      if (isEdit) {
        await api.put(`/participants/${participant.id}`, data);
      } else {
        const res = await api.post("/participants", data);
        createdId = res.data?.id;
      }
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
      onSuccess?.(createdId);
    } catch {
      setSubmitError(
        t(isEdit ? "edit_participant.error" : "create_participant.error"),
      );
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
                ? "edit_participant.title"
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
                          {enums?.sex_at_birth.map((e) => (
                            <SelectItem key={e.code} value={e.code}>
                              {e[lang]}
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
                  name="city_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_participant.city_of_birth")}</FormLabel>
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
                          {enums?.vital_status.map((e) => (
                            <SelectItem key={e.code} value={e.code}>
                              {e[lang]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {vitalStatus === "deceased" && (
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
                )}
              </div>
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
              <div className="grid grid-cols-2 gap-4">
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
                <FormField
                  schema={schema}
                  control={form.control}
                  name="apartment_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.apartment_number")}
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                <FormField
                  schema={schema}
                  control={form.control}
                  name="preferred_language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("create_participant.preferred_language")}
                      </FormLabel>
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
            </fieldset>

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
