"use client";

import * as React from "react";
import {
  BanIcon,
  EllipsisIcon,
  SendIcon,
  Share2,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const messagesData = [
  {
    id: 1,
    role: "agent",
    content: "Hi, how can I help you today?",
  },
  {
    id: 2,
    role: "user",
    content: "Hey, I'm having trouble with my account.",
  },
  {
    id: 3,
    role: "agent",
    content: "What seems to be the problem?",
  },
  {
    id: 4,
    role: "user",
    content: "I can't log in.",
  },
];

type Message = (typeof messagesData)[number];

export default function ChatCard() {
  const [messages, setMessages] = React.useState<Message[]>(messagesData);
  const [input, setInput] = React.useState("");
  const inputLength = input.trim().length;

  return (
    <Card className="md:w-96 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src="/images/avatars/01.png" alt="avatar" />
            <AvatarFallback>TB</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="text-sm leading-none font-medium">Toby Belhome</div>
            <div className="text-muted-foreground text-xs">
              c@shadcnuikit.com
            </div>
          </div>
        </CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="-mt-2"><EllipsisIcon /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <UserIcon size={16} aria-hidden="true" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 size={16} aria-hidden="true" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BanIcon size={16} aria-hidden="true" />
                Block
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <TrashIcon size={16} aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted",
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (inputLength === 0) return;
            setMessages([
              ...messages,
              {
                id: Math.random() * 10,
                role: "user",
                content: input,
              },
            ]);
            setInput("");
          }}
          className="flex w-full items-center space-x-2"
        >
          <Input
            id="message"
            placeholder="Type your message..."
            className="flex-1"
            autoComplete="off"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button type="submit" size="icon" disabled={inputLength === 0}>
            <SendIcon />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
