import type { NextPage } from "next";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/router";
import React, { FormEvent, useCallback, useState } from "react";
import PageLayout from "../components/PageLayout";
import { Button, Form, Input } from "@canonical/react-components";

export interface Response {
  data: {
    redirect_to?: string;
  };
}

async function acceptUserCode(userCode: string, challenge: string) {
  return axios
    .put(`../api/device?device_challenge=${challenge}`, {
      user_code: userCode,
    })
    .then(({ data }: Response) => {
      if (data.redirect_to) {
        window.location.href = data.redirect_to;
      }
    });
}

const DeviceCode: NextPage = () => {
  const router = useRouter();
  const { device_challenge: challenge, user_code: code } = router.query;
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const userCode = formData.get("code") as string;
      acceptUserCode(String(userCode), String(challenge)).catch(
        (error: AxiosError) => {
          // TODO(nsklikas): Refactor when proper error handling is
          // implemented in the backend
          if (error.response?.status == 400) {
            setErrorMessage(
              "The code is either invalid, expired or already used",
            );
          } else {
            setErrorMessage("Something went wrong, please try again");
          }
        },
      );
    },
    [challenge],
  );

  return (
    <PageLayout title="Enter code to continue">
      <Form onSubmit={handleSubmit}>
        <Input
          id="code"
          name="code"
          type="text"
          placeholder="XXXXXXXX"
          autoFocus={true}
          defaultValue={code}
          error={errorMessage}
        />
        <Button
          type="submit"
          appearance="positive"
          className="u-no-margin--bottom"
        >
          Next
        </Button>
      </Form>
    </PageLayout>
  );
};

export default DeviceCode;
