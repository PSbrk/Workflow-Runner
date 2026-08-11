// Auto-generated bootstrap templates for client-side mode (Option D).
// Seeded into localStorage on first launch by templates.js.
// Regenerate by running setup-builtins.cmd.

globalThis.WfrBuiltinTemplates = [
  {
    "id": "Contract-Termination",
    "title": "PM wants to terminate a Contract.",
    "steps": [
      {
        "id": "s1",
        "type": "action",
        "label": "PM wants to terminate a contract.",
        "position": {
          "x": 766.0001220703125,
          "y": 79
        },
        "next": "s2"
      },
      {
        "id": "s2",
        "type": "action",
        "label": "Find contract in Conga.",
        "position": {
          "x": 766.0003051757812,
          "y": 153.9997100830078
        },
        "next": "s4"
      },
      {
        "id": "s3",
        "type": "action",
        "label": "In the \"Reason for Termination\" line, firstly, list the reason, and then add \"Please do not send the letter of termination directly to the vendor, please send it to [coordinator]@life.church so that the Property manager can deliver it in person.",
        "position": {
          "x": 762.000244140625,
          "y": 456.0000915527344
        },
        "next": "s6"
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Copy out as much information as you can (doing this in a separate window might help).",
        "position": {
          "x": 765.000244140625,
          "y": 236.9998321533203
        },
        "next": "s5"
      },
      {
        "id": "s5",
        "type": "action",
        "label": "In Conga, select New Request, and then Contract Termination Request.",
        "position": {
          "x": 760.000244140625,
          "y": 337.99993896484375
        },
        "next": "s3"
      },
      {
        "id": "s6",
        "type": "action",
        "label": "Fill out the rest of the document as required.",
        "position": {
          "x": 766.000244140625,
          "y": 582.000244140625
        },
        "next": "s7"
      },
      {
        "id": "s7",
        "type": "action",
        "label": "Review what you've put in for errors.",
        "position": {
          "x": 767.0003051757812,
          "y": 668.0003051757812
        },
        "next": "s8"
      },
      {
        "id": "s8",
        "type": "action",
        "label": "Submit the request when ready.",
        "position": {
          "x": 768.0002136230469,
          "y": 737.0003967285156
        },
        "next": "end"
      }
    ],
    "endPosition": {
      "x": 769.0009765625,
      "y": 812.0010681152344
    }
  },
  {
    "id": "FMX-before-OctandCenB",
    "title": "FMX Ticket for CEN B before October 20206",
    "steps": [
      {
        "id": "s1",
        "type": "action",
        "label": "FMX - So you've received a ticket for something in CEN B.",
        "position": {
          "x": 718,
          "y": 78
        },
        "next": "s2"
      },
      {
        "id": "s2",
        "type": "decision",
        "label": "Is it building related or a room set-up?",
        "position": {
          "x": 716.000244140625,
          "y": 168.99977111816406
        },
        "options": [
          {
            "label": "Building related issue.",
            "goto": "s3"
          },
          {
            "label": "A room set-up request.",
            "goto": "s12"
          }
        ]
      },
      {
        "id": "s3",
        "type": "action",
        "label": "Open up Base camp, this is the RED team's equivalent of Asana.",
        "position": {
          "x": 393.9999084472656,
          "y": 250.99981689453125
        },
        "next": "s4"
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Choose CEN B Warranty. It is likely the only board you have been invited to.",
        "position": {
          "x": 395.99993896484375,
          "y": 338.9999084472656
        },
        "next": "s5"
      },
      {
        "id": "s5",
        "type": "action",
        "label": "Select Add ToDo.",
        "position": {
          "x": 398.9997863769531,
          "y": 419.9999694824219
        },
        "next": "s6"
      },
      {
        "id": "s6",
        "type": "action",
        "label": "Give the description (brief), then assign the following persons: James Fishburn, Loni Bell, Brad Lasater and Sarah Rodrigues.",
        "position": {
          "x": 399.9999694824219,
          "y": 506.00006103515625
        },
        "next": "s7"
      },
      {
        "id": "s7",
        "type": "action",
        "label": "For Who to notify when done, put yourself, and unless it NEEDS to be done asap, set the date as a week out.",
        "position": {
          "x": 399.49993896484375,
          "y": 602.0001525878906
        },
        "next": "s8"
      },
      {
        "id": "s8",
        "type": "action",
        "label": "In the notes section, let them know who submitted the FMX ticket, and put the note from FMX into the section. Add any photos that came with the ticket. You can drag and drop.",
        "position": {
          "x": 395.999755859375,
          "y": 711.000244140625
        },
        "next": "s9"
      },
      {
        "id": "s9",
        "type": "action",
        "label": "Select the \"Add to To Do list.\"",
        "position": {
          "x": 394.99993896484375,
          "y": 809
        },
        "next": "s10"
      },
      {
        "id": "s10",
        "type": "action",
        "label": "Come out of Basecamp and back to FMX.",
        "position": {
          "x": 393.99993896484375,
          "y": 883.0001220703125
        },
        "next": "s11"
      },
      {
        "id": "s11",
        "type": "action",
        "label": "Resolve the ticket, and in the message section, thank the person who put in the ticket. Then explain that this is covered by the warranty on CEN B, and so you have passed it onto the Retail and Development team, who will handle it from here.",
        "position": {
          "x": 392.0000915527344,
          "y": 991.0031127929688
        },
        "next": "end"
      },
      {
        "id": "s12",
        "type": "action",
        "label": "Go through the room set-ups workflow, this is the wrong one!",
        "position": {
          "x": 898.00048828125,
          "y": 254.49932861328125
        },
        "next": "end"
      }
    ],
    "endPosition": {
      "x": 728.0006103515625,
      "y": 1175.0024719238281
    }
  },
  {
    "id": "Updating-spend-amounts",
    "title": "Updating Spend amounts",
    "steps": [
      {
        "id": "s1",
        "type": "action",
        "label": "The \"amounts spent on our contracts\" needs updating.",
        "position": {
          "x": 906,
          "y": 75
        },
        "next": "s2"
      },
      {
        "id": "s2",
        "type": "action",
        "label": "Go to Tableau. Sign in.",
        "position": {
          "x": 904.0001220703125,
          "y": 156.9998779296875
        },
        "next": "s3"
      },
      {
        "id": "s3",
        "type": "action",
        "label": "In the filters, in Department, choose only \"000\" and\"107\".",
        "position": {
          "x": 904.0001220703125,
          "y": 239.99989318847656
        },
        "next": "s4"
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Now, in the filters, in Account, choose only 63015, 63020, 63040, 63080 and 63090.",
        "position": {
          "x": 903.0001220703125,
          "y": 334.99993896484375
        },
        "next": "s5"
      },
      {
        "id": "s5",
        "type": "action",
        "label": "Click download in the top left of the page (big button).",
        "position": {
          "x": 900.5001220703125,
          "y": 430.9999694824219
        },
        "next": "s6"
      },
      {
        "id": "s6",
        "type": "action",
        "label": "In the Download Crosstab pop-up that has appeared, choose Transactions, and then CSV for the file type. Then click download.",
        "position": {
          "x": 898.5001220703125,
          "y": 531
        },
        "next": "s7"
      },
      {
        "id": "s7",
        "type": "wait",
        "label": "The file usually arrives in your downloads folder unless you have specified a different path.",
        "position": {
          "x": 895.5001220703125,
          "y": 656.0000305175781
        }
      }
    ],
    "endPosition": {
      "x": 894.0001220703125,
      "y": 930.0003356933594
    }
  },
  {
    "id": "contract-checker-pre-legal",
    "title": "Contract Checking",
    "steps": [
      {
        "id": "s1",
        "type": "action",
        "label": "Receive a quote/contract",
        "position": {
          "x": 156.98727416992188,
          "y": 73.00004959106445
        },
        "next": "s2"
      },
      {
        "id": "s2",
        "type": "action",
        "label": "Before going through the Conga Step, open up an instance of \"Contract Checker\". (C:\\Users\\philip.seabrook\\ContractChecker\\checker.html)",
        "position": {
          "x": 503.82177734375,
          "y": 95.93701934814453
        },
        "next": "s3"
      },
      {
        "id": "s3",
        "type": "action",
        "label": "Check the left hand side of the html window, and see if all the terms that you want to be aware of are listed.",
        "position": {
          "x": 901.9407653808594,
          "y": 95.93583679199219
        },
        "next": "s4"
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Once you are happy with the terms, copy prompt to clipboard, and open an instance of Claude.",
        "position": {
          "x": 1281.5075378417969,
          "y": 96.94001007080078
        },
        "next": "s5"
      },
      {
        "id": "s5",
        "type": "action",
        "label": "Post your copied prompt into the version of Claude (Ctrl+v) you are comfortable with. Then drag and drop the contract you want checked into Claude. Press the return key to set Claude working.",
        "position": {
          "x": 1697.5082397460938,
          "y": 96.6549072265625
        },
        "next": "s6"
      },
      {
        "id": "s6",
        "type": "wait",
        "label": "Wait for Claude to process the request.",
        "position": {
          "x": 161.0643768310547,
          "y": 239.22726440429688
        },
        "next": "s7"
      },
      {
        "id": "s7",
        "type": "action",
        "label": "Once Claude has finished. Copy the entire json file over to the Contract Checker in the \"Paste Claudes Reply\" box, and click the \"Render Report\" box.",
        "position": {
          "x": 485.2083740234375,
          "y": 381.6569519042969
        },
        "next": "s8"
      },
      {
        "id": "s8",
        "type": "wait",
        "label": "You now see the report. You do not need to save it, but it can be helpful.",
        "position": {
          "x": 831.2472381591797,
          "y": 249.00225830078125
        },
        "next": "s20"
      },
      {
        "id": "s9",
        "type": "action",
        "label": "Open up the COI Filer and drag-drop the COI that came with the Contract into the filer. ",
        "position": {
          "x": 1308.756103515625,
          "y": 296.99853515625
        },
        "next": "s10"
      },
      {
        "id": "s10",
        "type": "wait",
        "label": "You'll see the output. It will tell you if it had an issue with reading the file, in which case you want to check manually. Red text is bad, yellow is cautionary, black is good. If the COI passes, then no further steps are required with the COI.",
        "position": {
          "x": 1408.7508544921875,
          "y": 530.0017395019531
        },
        "next": "s23"
      },
      {
        "id": "s14",
        "type": "decision",
        "label": "Is there a listed address?",
        "position": {
          "x": 1873.763916015625,
          "y": 443.9964599609375
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s15"
          },
          {
            "label": "No",
            "goto": "s31"
          }
        ]
      },
      {
        "id": "s15",
        "type": "decision",
        "label": "Is there a Social Security Number or Employer Identification number listed? (Part 1)",
        "position": {
          "x": 1866.7603759765625,
          "y": 620.99755859375
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s16"
          },
          {
            "label": "No.",
            "goto": "s31"
          }
        ]
      },
      {
        "id": "s16",
        "type": "decision",
        "label": "Is the form signed?",
        "position": {
          "x": 1871.7587890625,
          "y": 797.999267578125
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s17"
          },
          {
            "label": "No",
            "goto": "s31"
          }
        ]
      },
      {
        "id": "s17",
        "type": "decision",
        "label": "Was the signature within the last 4 years?",
        "position": {
          "x": 1864.7693481445312,
          "y": 910.001708984375
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s22"
          },
          {
            "label": "No",
            "goto": "s31"
          }
        ]
      },
      {
        "id": "s19",
        "type": "action",
        "label": "Add to the email that there were some irregularities with the W9 that you received, and ask if they can provide you with an up to date version.",
        "position": {
          "x": 1661.7566528320312,
          "y": 1310.0023193359375
        },
        "next": "s37"
      },
      {
        "id": "s20",
        "type": "decision",
        "label": "Has the report flagged against Net 30, Auto-renewal, Contract length, Name/promotional Rights or Early termination?",
        "position": {
          "x": 826.3693237304688,
          "y": 526.9986572265625
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s24"
          },
          {
            "label": "No",
            "goto": "s9"
          }
        ]
      },
      {
        "id": "s21",
        "type": "decision",
        "label": "Sadly, the W-9 checker is not Mac compatible (yet). Open the W-9 and check the following: Does the Name of Entity/Individual (1) and/or Business name (2) match the vendor name?",
        "position": {
          "x": 1874.861328125,
          "y": 299.99212646484375
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s14"
          },
          {
            "label": "No",
            "goto": "s31"
          }
        ]
      },
      {
        "id": "s22",
        "type": "action",
        "label": "The W-9 is good, no further action needed for the W9.",
        "position": {
          "x": 1940.5762939453125,
          "y": 1047.9986572265625
        },
        "next": "s35"
      },
      {
        "id": "s23",
        "type": "decision",
        "label": "Does the COI look good to go?",
        "position": {
          "x": 1408.5328369140625,
          "y": 674.9954223632812
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s27"
          },
          {
            "label": "No",
            "goto": "s25"
          }
        ]
      },
      {
        "id": "s24",
        "type": "action",
        "label": "Start drafting an email to the vendor. Their email address can be found in the relevant submission in Asana. Title the email at the end, I'll say when.",
        "position": {
          "x": 303.5271301269531,
          "y": 669.9954833984375
        },
        "next": "s26"
      },
      {
        "id": "s25",
        "type": "decision",
        "label": "Have you already started drafting an email to the vendor?",
        "position": {
          "x": 940.5303955078125,
          "y": 778.9959716796875
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s28"
          },
          {
            "label": "No",
            "goto": "s30"
          }
        ]
      },
      {
        "id": "s26",
        "type": "action",
        "label": "Introduce yourself, let them know who gave you their contact, what work this pertains to, and your relevance to this process. Explain that you know that your legal team will push back on the flagged items, and ask if they would be happy and able to make changes to the proposed contract to match our organisational preferences. DO NOT SEND THE EMAIL YET.",
        "position": {
          "x": 324.5273742675781,
          "y": 823.99609375
        },
        "next": "s9"
      },
      {
        "id": "s27",
        "type": "action",
        "label": "Good, No further action on the COI required.",
        "position": {
          "x": 1397.5325927734375,
          "y": 778.9960327148438
        },
        "next": "s21"
      },
      {
        "id": "s28",
        "type": "action",
        "label": "Add to the email that you also need a new COI, and explain your reasoning (usually it is out of date). Still do not send the email yet.",
        "position": {
          "x": 906.5302734375,
          "y": 1092.9974365234375
        },
        "next": "s21"
      },
      {
        "id": "s29",
        "type": "action",
        "label": "Introduce yourself, let them know who gave you their contact, what work this pertains to, and your relevance to this process. Explain that you noted that the COI was out of date, and ask if they would send you an up to date version. DO NOT SEND THE EMAIL YET.",
        "position": {
          "x": 414.52783203125,
          "y": 1156.9978637695312
        },
        "next": "s21"
      },
      {
        "id": "s30",
        "type": "action",
        "label": "Start drafting an email to the vendor. Their email address can be found in the relevant submission in Asana. Title the email at the end, I'll say when.",
        "position": {
          "x": 416.5277099609375,
          "y": 1025.9970703125
        },
        "next": "s29"
      },
      {
        "id": "s31",
        "type": "decision",
        "label": "Have you already started drafting an email to the vendor?",
        "position": {
          "x": 1524.5333251953125,
          "y": 907.9966430664062
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s19"
          },
          {
            "label": "No",
            "goto": "s32"
          }
        ]
      },
      {
        "id": "s32",
        "type": "action",
        "label": "Start drafting an email to the vendor. Their email address can be found in the relevant submission in Asana. Title the email \"W9 request\".",
        "position": {
          "x": 1307.531982421875,
          "y": 1023.9967041015625
        },
        "next": "s33"
      },
      {
        "id": "s33",
        "type": "action",
        "label": "Introduce yourself, let them know who gave you their contact, what work this pertains to and your relevance to this process. Explain that you noted that there were some irregularities with the W9 you recevied, and ask if they would send you an up to date version. ",
        "position": {
          "x": 1343.5322265625,
          "y": 1166.9970703125
        },
        "next": "s34"
      },
      {
        "id": "s34",
        "type": "action",
        "label": "Send your email, make a note of your actions in the Asana Comments Section.",
        "position": {
          "x": 1185.8839111328125,
          "y": 1534.0062866210938
        },
        "next": "end"
      },
      {
        "id": "s35",
        "type": "decision",
        "label": "Have you started an email pertaining to the Contract or COI?",
        "position": {
          "x": 1911.0660400390625,
          "y": 1452.4895629882812
        },
        "options": [
          {
            "label": "Yes",
            "goto": "s37"
          },
          {
            "label": "No",
            "goto": "s36"
          }
        ]
      },
      {
        "id": "s36",
        "type": "action",
        "label": "Then all parts look good to go. No emails need to go out, just go through the normal submission process in Conga. Note when you sent in the submission in the Asana comments section.",
        "position": {
          "x": 1888.06591796875,
          "y": 1662.491455078125
        },
        "next": "end"
      },
      {
        "id": "s37",
        "type": "action",
        "label": "Title your email appropriately. Remember that you are typically a stranger to them, asking for personal details, Use diplomacy.",
        "position": {
          "x": 1033.05810546875,
          "y": 1359.488525390625
        },
        "next": "s34"
      }
    ],
    "endPosition": {
      "x": 1193.71826171875,
      "y": 1734.9838562011719
    }
  },
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
    "id": "new-asana-task",
    "title": "New Task in Asana",
    "steps": [
      {
        "id": "s1",
        "type": "decision",
        "label": "Work needed/Contractor Onboarding requested",
        "position": {
          "x": 1575.5697631835938,
          "y": 54.99895095825195
        },
        "options": [
          {
            "label": "Begin.",
            "goto": "s2"
          },
          {
            "label": "I didn't receice anything.",
            "goto": "s50"
          }
        ]
      },
      {
        "id": "s2",
        "type": "decision",
        "label": "Does this work need to happen in the next 24 hours?",
        "position": {
          "x": 1577.5143127441406,
          "y": 199.8062286376953
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s3"
          },
          {
            "label": "No.",
            "goto": "s13"
          }
        ]
      },
      {
        "id": "s3",
        "type": "decision",
        "label": "What is the estimated cost?",
        "position": {
          "x": 841.9612121582031,
          "y": 357.58544921875
        },
        "options": [
          {
            "label": "Less than $5,000",
            "goto": "s55"
          },
          {
            "label": "$5000 - $24,999",
            "goto": "s41"
          },
          {
            "label": ">$25,000",
            "goto": "s42"
          }
        ]
      },
      {
        "id": "s4",
        "type": "action",
        "label": "Make a PowerForm and get in touch with the PM. Request the dollar amount, the contractor's name, the amount per hour/per project and the start and end dates. Inform them that you will need the contractors W-9 and COI within 48 hours.",
        "position": {
          "x": 329.9853515625,
          "y": 524.2538757324219
        },
        "next": "s5"
      },
      {
        "id": "s5",
        "type": "action",
        "label": "Submit the PowerForm.",
        "position": {
          "x": 325.5386962890625,
          "y": 628.6994018554688
        },
        "next": "s6"
      },
      {
        "id": "s6",
        "type": "wait",
        "label": "This goes to both the Coordinator and the Location Support inbox.",
        "position": {
          "x": 321.0942077636719,
          "y": 730.9226989746094
        },
        "next": "s7"
      },
      {
        "id": "s7",
        "type": "action",
        "label": "Get in touch with your leader now! Explain situation. Stay on the phone through the next stage.",
        "position": {
          "x": 318.87200927734375,
          "y": 853.1462097167969
        },
        "next": "s8"
      },
      {
        "id": "s8",
        "type": "action",
        "label": "Coordinator (you) process the PowerForm via Docusign.",
        "position": {
          "x": 314.427490234375,
          "y": 950.925048828125
        },
        "next": "s9"
      },
      {
        "id": "s9",
        "type": "wait",
        "label": "PM should get you the W-9 and COI.",
        "position": {
          "x": 312.2052001953125,
          "y": 1050.9261169433594
        },
        "next": "s35"
      },
      {
        "id": "s13",
        "type": "decision",
        "label": "What type of request is this?",
        "position": {
          "x": 2152.2164306640625,
          "y": 306.47381591796875
        },
        "options": [
          {
            "label": "A proposal with terms (\"Contract\").",
            "goto": "s14"
          },
          {
            "label": "A Proposal without terms/quote, contract ect.",
            "goto": "s15"
          }
        ]
      },
      {
        "id": "s14",
        "type": "wait",
        "label": "PM collects W-9, COI and Proposal/terms/contract agreement.",
        "position": {
          "x": 1782.3307495117188,
          "y": 522.0316467285156
        },
        "next": "s16"
      },
      {
        "id": "s15",
        "type": "wait",
        "label": "PM collects W-9, COI and predicted $ amount for the duration of the contract.",
        "position": {
          "x": 2475.6600341796875,
          "y": 522.0316467285156
        },
        "next": "s21"
      },
      {
        "id": "s16",
        "type": "decision",
        "label": "Are the submitted files all present?",
        "position": {
          "x": 1782.5071411132812,
          "y": 668.6997985839844
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s17"
          },
          {
            "label": "No.",
            "goto": "s18"
          }
        ]
      },
      {
        "id": "s17",
        "type": "decision",
        "label": "Are all the files in pdf. ,.doc or .docx (Microsoft word) format?",
        "position": {
          "x": 1778.0625,
          "y": 770.9232177734375
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s19"
          },
          {
            "label": "No.",
            "goto": "s20"
          }
        ]
      },
      {
        "id": "s18",
        "type": "action",
        "label": "Request PM to supply the required documentation (W-9, COI and terms/contract/proposal/quote).",
        "position": {
          "x": 1466.9481201171875,
          "y": 606.4769592285156
        },
        "next": "s14"
      },
      {
        "id": "s19",
        "type": "action",
        "label": "Input relevant data into Conga and submit.",
        "position": {
          "x": 1782.5070190429688,
          "y": 875.3686828613281
        },
        "next": "s26"
      },
      {
        "id": "s20",
        "type": "action",
        "label": "Convert files into pdf. or .doc or .docx format.",
        "position": {
          "x": 1418.05859375,
          "y": 766.4786376953125
        },
        "next": "s17"
      },
      {
        "id": "s21",
        "type": "decision",
        "label": "Are the submitted files all present?",
        "position": {
          "x": 2469.1808471679688,
          "y": 648.6996459960938
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s22"
          },
          {
            "label": "No.",
            "goto": "s23"
          }
        ]
      },
      {
        "id": "s22",
        "type": "decision",
        "label": "Are all the files in pdf. or .docs (Microsoft word) format?",
        "position": {
          "x": 2462.5142822265625,
          "y": 762.0341491699219
        },
        "options": [
          {
            "label": "No.",
            "goto": "s24"
          },
          {
            "label": "Yes.",
            "goto": "s25"
          }
        ]
      },
      {
        "id": "s23",
        "type": "action",
        "label": "Request PM to supply the required documentation (W-9, COI and terms/contract/proposal/quote).",
        "position": {
          "x": 2142.510986328125,
          "y": 599.8102111816406
        },
        "next": "s15"
      },
      {
        "id": "s24",
        "type": "action",
        "label": "Convert files into pdf. or .doc or .docx format.",
        "position": {
          "x": 2126.9552001953125,
          "y": 764.2564086914062
        },
        "next": "s22"
      },
      {
        "id": "s25",
        "type": "action",
        "label": "Input relevant data into Conga and submit.",
        "position": {
          "x": 2464.7362670898438,
          "y": 866.4796752929688
        },
        "next": "s26"
      },
      {
        "id": "s26",
        "type": "action",
        "label": "Wait for Legal to send you an email.",
        "position": {
          "x": 2124.7327270507812,
          "y": 877.5909729003906
        },
        "next": "s28"
      },
      {
        "id": "s27",
        "type": "decision",
        "label": "Communicate again with Legal to ensure that this has not been lost/buried. They have a lot on!",
        "position": {
          "x": 1782.0634765625,
          "y": 985.8148498535156
        },
        "nextLabel": "It's been at least 5 buisness days, and still no news.",
        "options": [
          {
            "label": "It's been at least 5 buisness days, and still no news.",
            "goto": "s33"
          },
          {
            "label": "It has been less than 5 buisness days.",
            "goto": "s26"
          }
        ]
      },
      {
        "id": "s28",
        "type": "decision",
        "label": "Did you receive a response?",
        "position": {
          "x": 2125.6704711914062,
          "y": 957.0025634765625
        },
        "options": [
          {
            "label": "No, and I've waited a few days.",
            "goto": "s27"
          },
          {
            "label": "Yes, they sent me an ICA for the vendor to review.",
            "goto": "s29"
          },
          {
            "label": "Yes, they sent me an email that says \"Your Document has been completed\" in the body of the text, with a link to a docusign document.",
            "goto": "s30"
          }
        ]
      },
      {
        "id": "s29",
        "type": "action",
        "label": "Using the email address and information provided in the form (from Asana), email the vendor asking them to review the ICA, and to let you know if it is agreeable. If it is, then the coordinator will let legal know, and the signable document will follow.  ",
        "position": {
          "x": 2123.6704711914062,
          "y": 1207.0042114257812
        },
        "next": "s43"
      },
      {
        "id": "s30",
        "type": "action",
        "label": "The contract is now active. Update Asana to reflect this.",
        "position": {
          "x": 2481.6727905273438,
          "y": 1067.00341796875
        },
        "next": "s31"
      },
      {
        "id": "s31",
        "type": "wait",
        "label": "[Placeholder] for assessment of contract expense vs value process.",
        "position": {
          "x": 2493.6677856445312,
          "y": 1823.0079345703125
        },
        "next": "s56"
      },
      {
        "id": "s33",
        "type": "action",
        "label": "Get in touch with your leader for advice.",
        "position": {
          "x": 1783.66845703125,
          "y": 1097.0032958984375
        },
        "next": "s38"
      },
      {
        "id": "s34",
        "type": "action",
        "label": "Submit these documents (W-9 and COI) to legal.",
        "position": {
          "x": 307.6590576171875,
          "y": 1251.0045166015625
        },
        "next": "s30"
      },
      {
        "id": "s35",
        "type": "decision",
        "label": "Did you receive the COI and W-9?",
        "position": {
          "x": 309.65911865234375,
          "y": 1141.003662109375
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s34"
          },
          {
            "label": "Not yet, and the 48 hour window is running out.",
            "goto": "s36"
          }
        ]
      },
      {
        "id": "s36",
        "type": "decision",
        "label": "Contact the PM responsible for collecting these documents. You need them asap.",
        "position": {
          "x": 683.6614379882812,
          "y": 1147.0037231445312
        },
        "options": [
          {
            "label": "Ok, I will do that step now.",
            "goto": "s35"
          },
          {
            "label": "I have done this already.",
            "goto": "s37"
          }
        ]
      },
      {
        "id": "s37",
        "type": "action",
        "label": "Contact your leader. Explain the situation and ask for advice.",
        "position": {
          "x": 677.6613159179688,
          "y": 1421.0055541992188
        },
        "next": "s38"
      },
      {
        "id": "s38",
        "type": "decision",
        "label": "Did you manage to reach your leader?",
        "position": {
          "x": 1107.6640625,
          "y": 1347.005126953125
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s40"
          },
          {
            "label": "No.",
            "goto": "s39"
          }
        ]
      },
      {
        "id": "s39",
        "type": "decision",
        "label": "Escalate until you reach your CGL if you need to. That said, do not skip trying to reach the next up the chain each time first.",
        "position": {
          "x": 1283.6650390625,
          "y": 1449.0056762695312
        },
        "options": [
          {
            "label": "Ok, I am in communication with them.",
            "goto": "s40"
          },
          {
            "label": "I cannot get in touch with them.",
            "goto": "s51"
          }
        ]
      },
      {
        "id": "s40",
        "type": "action",
        "label": "Do as your leader has directed. This may lead you out of the workflow in this app. Don't panic, you can find the relevant tile again by using some imagination and/or direction.",
        "position": {
          "x": 869.6626586914062,
          "y": 1543.0062866210938
        },
        "next": "end"
      },
      {
        "id": "s41",
        "type": "wait",
        "label": "This is handled by the PM and leader echelon 1. In the Location Support Craft app, there is a document titled \"CapEx Approval Process\". At present, the coordinator role only does step 7, the Conga submission step.",
        "position": {
          "x": 843.4122924804688,
          "y": 622.7504272460938
        },
        "next": "s52"
      },
      {
        "id": "s42",
        "type": "wait",
        "label": "You should not receive this. Tell the PM that they need to call their leader now.",
        "position": {
          "x": 1133.330810546875,
          "y": 705.9172973632812
        },
        "next": "s54"
      },
      {
        "id": "s43",
        "type": "decision",
        "label": "Did you receive a response?",
        "position": {
          "x": 2121.6692504882812,
          "y": 1339.0049438476562
        },
        "options": [
          {
            "label": "Yes. They agree to the terms.",
            "goto": "s44"
          },
          {
            "label": "They have not declined, but have questions.",
            "goto": "s45"
          },
          {
            "label": "The vendor/contractor refuses the ICA.",
            "goto": "s46"
          }
        ]
      },
      {
        "id": "s44",
        "type": "action",
        "label": "Inform Legal.",
        "position": {
          "x": 2235.9251708984375,
          "y": 1467.005859375
        },
        "next": "s47"
      },
      {
        "id": "s45",
        "type": "action",
        "label": "Respond to any questions they have to the best of your ability. Contact legal for clarification if needed.",
        "position": {
          "x": 1915.9230346679688,
          "y": 1479.005859375
        },
        "next": "s43"
      },
      {
        "id": "s46",
        "type": "action",
        "label": "Inform Legal, then inform the PM that they need to find another vendor for the job. Provide the reason.",
        "position": {
          "x": 1725.9219970703125,
          "y": 1339.0049438476562
        },
        "next": "end"
      },
      {
        "id": "s47",
        "type": "wait",
        "label": "Legal will now send out a DocuSign for the CGL (or higher) and the vendor to sign.",
        "position": {
          "x": 2239.92529296875,
          "y": 1581.0065307617188
        },
        "next": "s48"
      },
      {
        "id": "s48",
        "type": "decision",
        "label": "Have you received an email stating that \"Your document has been completed\" for this contract within 5 working days?",
        "position": {
          "x": 2057.9238891601562,
          "y": 1689.0071411132812
        },
        "options": [
          {
            "label": "Yes.",
            "goto": "s49"
          },
          {
            "label": "No.",
            "goto": "s37"
          }
        ]
      },
      {
        "id": "s49",
        "type": "action",
        "label": "Update Asana. Thanks for playing; you are good to go!",
        "position": {
          "x": 1963.92333984375,
          "y": 1843.0081176757812
        },
        "next": "end"
      },
      {
        "id": "s50",
        "type": "action",
        "label": "If you didn't receive anything, then this is not the right workflow!",
        "position": {
          "x": 1253.831298828125,
          "y": 60.002418518066406
        },
        "next": "end"
      },
      {
        "id": "s51",
        "type": "action",
        "label": "Get praying and keep trying.",
        "position": {
          "x": 1254.833251953125,
          "y": 1601.0059814453125
        },
        "next": "s39"
      },
      {
        "id": "s52",
        "type": "action",
        "label": "Input information into Conga as directed.",
        "position": {
          "x": 844.1657104492188,
          "y": 778.8017578125
        },
        "next": "s53"
      },
      {
        "id": "s53",
        "type": "decision",
        "label": "Wait for a response from Legal.",
        "position": {
          "x": 842.9156494140625,
          "y": 867.5520629882812
        },
        "options": [
          {
            "label": "No, and it has been 48 hours since the last step, or what they responded with is asking for more information.",
            "goto": "s54"
          },
          {
            "label": "Yes, they sent me an email that says \"Your Document has been completed\" in the body of the text.",
            "goto": "s30"
          }
        ]
      },
      {
        "id": "s54",
        "type": "action",
        "label": "Talk to your leader and explain the process so far.",
        "position": {
          "x": 662.498291015625,
          "y": 985.4692993164062
        },
        "next": "s40"
      },
      {
        "id": "s55",
        "type": "wait",
        "label": "To open the PowerForm, go to https://www.docusign.com/send/home, and use the Location Support email and password as the login criteria. Then, click on Templates in the top bar, shared with me in the left side-bar, and use the form named, \"Location Support ICA\". This is the PowerForm.",
        "position": {
          "x": 343.8246154785156,
          "y": 295.0032043457031
        },
        "next": "s4"
      },
      {
        "id": "s56",
        "type": "action",
        "label": "This part is not yet complete.",
        "position": {
          "x": 2497.9222412109375,
          "y": 1930.0560913085938
        },
        "next": "end"
      }
    ],
    "endPosition": {
      "x": 1555.56201171875,
      "y": 2090.0137939453125
    }
  }
];
