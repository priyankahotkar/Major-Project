Some feactures ( which added in issues..)

1.ChatGPT-Powered FAQ Assistant

Use open Ai api so when it can help when the mentor is not available. So user means mentee can engage on website.
Open Ai api : https://platform.openai.com/docs/introduction

2.Recommend Learning Resources Based on Roadmap Topics ( This for add more features in project )

This feature recommends high-quality learning resources like YouTube videos, GitHub repositories, or blogs based on the student’s roadmap topics.

Use : YouTube API / GitHub API
YouTube api : https://developers.google.com/youtube/v3
GitHub api : https://docs.github.com/en/rest/search

3.Add Toxic Comment Detection in Chat and Forum

This module automatically checks if a message in a chat or post contains toxic, offensive, or inappropriate language.

Use : Perspective API by google or HuggingFace’s toxicity classification models
Perspective api : https://developers.perspectiveapi.com/
Model: unitary/toxic-bert
api : https://huggingface.co/models?search=toxicity

4.Classify Mentors into Personas using Clustering

Automatically groups mentors into specific categories like “DSA Mentor”, “Placement Coach”, etc., based on their bio or keywords provided during signup.
KMeans + TF-IDF: https://scikit-learn.org/stable/auto_examples/text/plot_document_clustering.html
Use : scikit-learn for TF-IDF and KMeans

5.Implement Learning Activity Tracker with Smart Reminders

Build a simple logic-based tracker that monitors user activity (sessions, logins, roadmap progress) and sends nudges when the user is inactive. Via mail or firebase notification.
Firebase Notifications: https://firebase.google.com/docs/cloud-messaging
SendGrid Email api has free tier: https://sendgrid.com/docs/API_Reference/api_v3.html
