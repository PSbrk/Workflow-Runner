// Auto-generated bootstrap templates for client-side mode (Option D).
// Seeded into localStorage on first launch by templates.js.
// Regenerate by running the script in setup-builtins.cmd.

globalThis.WfrBuiltinTemplates = [
  {
    "id": "ica-renewal",
    "title": "ICA Renewal",
    "steps": [
      {
        "id": "s1",
        "type": "action",
        "label": "Receive email From Asana informing us that there are >60 days on a contract that we want to be aware of.",
        "position": {
          "x": 995.501220703125,
          "y": 53.000579833984375
        },
        "next": "s5"
      },
      {
        "id": "s3",
        "type": "decision",
        "label": "Email PM. Ask if they want the ICA/contract renewed. If so, inform them that they spent [$x] last year, and would they like that amount to be adjusted?",
        "position": {
          "x": 988.7438354492188,
          "y": 272.0005340576172
        },
        "options": [
          {
            "label": "Yes, to renewal. Yes, to $# change.",
            "goto": "s4"
          },
          {
            "label": "Yes, renewal. No, $# change",
            "goto": "s6"
          },
          {
            "label": "No, to renewal",
            "goto": "s7"
          }
        ]
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Email or call the vendor, asking for a new COI and W-9.",
        "position": {
          "x": 405.25062561035156,
          "y": 357.2481994628906
        },
        "next": "s15"
      },
      {
        "id": "s5",
        "type": "action",
        "label": "Go to Tableau and search for the amount spent in the past year with said vendor.",
        "position": {
          "x": 991.50537109375,
          "y": 156.99705505371094
        },
        "next": "s3"
      },
      {
        "id": "s6",
        "type": "action",
        "label": "Email the vendor, asking for a new COI and W-9.",
        "position": {
          "x": 985.50244140625,
          "y": 414.7491149902344
        },
        "next": "s16"
      },
      {
        "id": "s7",
        "type": "action",
        "label": "Update Asana to allow ICA/contract to expire.",
        "position": {
          "x": 1413.9548645019531,
          "y": 452.79632568359375
        },
        "next": "end"
      },
      {
        "id": "s10",
        "type": "decision",
        "label": "Received response with COI and W-9?",
        "position": {
          "x": 409.6756896972656,
          "y": 545.5467529296875
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s11"
          },
          {
            "label": "No.",
            "goto": "s14"
          }
        ]
      },
      {
        "id": "s11",
        "type": "action",
        "label": "Fill in LS Project Intake form with the adjusted $ amount.",
        "position": {
          "x": 235.9241180419922,
          "y": 655.5477905273438
        },
        "next": "end"
      },
      {
        "id": "s12",
        "type": "decision",
        "label": "Received response with COI and W-9?",
        "position": {
          "x": 982.1803588867188,
          "y": 601.7972412109375
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s13"
          },
          {
            "label": "No.",
            "goto": "s14"
          }
        ]
      },
      {
        "id": "s13",
        "type": "action",
        "label": "Fill in LS Project Intake form with the correct $ amount.",
        "position": {
          "x": 807.178955078125,
          "y": 749.298583984375
        },
        "next": "end"
      },
      {
        "id": "s14",
        "type": "decision",
        "label": "Why was this not received?",
        "position": {
          "x": 1180.1807861328125,
          "y": 684.2977294921875
        },
        "options": [
          {
            "label": "No response.",
            "goto": "s17"
          },
          {
            "label": "Vendor refused to send information or to continue working with us.",
            "goto": "s20"
          },
          {
            "label": "The vendor has questions",
            "goto": "s21"
          }
        ]
      },
      {
        "id": "s15",
        "type": "action",
        "label": "Wait for vendor to respond. Make a note in Asana that you sent the email and record the date.",
        "position": {
          "x": 408.9252624511719,
          "y": 459.2960510253906
        },
        "next": "s10"
      },
      {
        "id": "s16",
        "type": "action",
        "label": "Wait for vendor to respond. Make a note in Asana that you sent the email and record the date.",
        "position": {
          "x": 982.6795654296875,
          "y": 503.0463562011719
        },
        "next": "s12"
      },
      {
        "id": "s17",
        "type": "decision",
        "label": "Have 5 days past since you sent the email/made the call?",
        "position": {
          "x": 1407.6827392578125,
          "y": 768.0484008789062
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s18"
          },
          {
            "label": "No.",
            "goto": "s19"
          }
        ]
      },
      {
        "id": "s18",
        "type": "decision",
        "label": "Re-send your COI and W-9 request. Consider making a call to the vendor.",
        "position": {
          "x": 1781.43017578125,
          "y": 795.548583984375
        },
        "options": [
          {
            "label": "This is the first time I have done this step.",
            "goto": "s16"
          },
          {
            "label": "I've already taken this step once before already.",
            "goto": "s20"
          }
        ]
      },
      {
        "id": "s19",
        "type": "decision",
        "label": "Wait until 5 working days has past. Do not move forward until this is satisfied.",
        "position": {
          "x": 1402.8735961914062,
          "y": 908.0490112304688
        },
        "options": [
          {
            "label": "I've waited for 5 days.",
            "goto": "s18"
          },
          {
            "label": "I have completed this step once before already.",
            "goto": "s20"
          }
        ]
      },
      {
        "id": "s20",
        "type": "action",
        "label": "Email or call PM to get in touch with the vendor, letting them know the process so far. Ask them to get in touch with the vendor, requesting a new COI and W-9 and asking the PM to send it as a new LS Project Intake form. Alternatively, recommend the PM to find another vendor and send the request as a new LS Project Intake form.",
        "position": {
          "x": 1285.6229248046875,
          "y": 1120.550537109375
        },
        "next": "end"
      },
      {
        "id": "s21",
        "type": "decision",
        "label": "Can you answer all their questions?",
        "position": {
          "x": 1008.4231567382812,
          "y": 844.2987060546875
        },
        "options": [
          {
            "label": "No.",
            "goto": "s22"
          },
          {
            "label": "Yes.",
            "goto": "s24"
          }
        ]
      },
      {
        "id": "s22",
        "type": "action",
        "label": "Email Legal with the questions. Await response.",
        "position": {
          "x": 838.422119140625,
          "y": 968.0494995117188
        },
        "next": "s23"
      },
      {
        "id": "s23",
        "type": "action",
        "label": "Email vendor with responses. Ask if they have any more questions.",
        "position": {
          "x": 498.41993713378906,
          "y": 748.048095703125
        },
        "next": "s16"
      },
      {
        "id": "s24",
        "type": "action",
        "label": "Send a return email answering their questions.",
        "position": {
          "x": 183.41786193847656,
          "y": 746.7980346679688
        },
        "next": "s16"
      }
    ],
    "endPosition": {
      "x": 790.0034790039062,
      "y": 1341.25146484375
    }
  },
  {
    "id": "test-1",
    "title": "Test 1",
    "steps": [
      {
        "id": "s2",
        "type": "decision",
        "label": "testing",
        "position": {
          "x": 630.9999084472656,
          "y": 134.99993133544922
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s3"
          },
          {
            "label": "No",
            "goto": "s4"
          }
        ]
      },
      {
        "id": "s3",
        "type": "wait",
        "label": "WAIT1",
        "position": {
          "x": 401.9999694824219,
          "y": 339
        }
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Just to show",
        "position": {
          "x": 856.5036315917969,
          "y": 315.0000915527344
        }
      }
    ],
    "endPosition": {
      "x": 221.00001525878906,
      "y": 506
    }
  }
];
